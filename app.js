var db = firebase.database();

firebase.auth().onAuthStateChanged(function(userInfo) {
  console.log("called 2", userInfo);
  if (userInfo) {
    //save user data in localstorage
    setUserLoggedIn(userInfo);

    //check if user data is stored in the db
    var userbase = firebase.database().ref("/users/" + userInfo.uid);
    userbase.once("value").then(function(snapshot) {
      var record = snapshot.val();
      if (!record || record.email !== userInfo.email) {
        var user = {
          email: userInfo.email,
          name: state.newUser.name ? state.newUser.name : userInfo.email
        };
        var updates = {};
        updates[`/users/${userInfo.uid}`] = user;
        return firebase
          .database()
          .ref()
          .update(updates);
      }
    });
    // ...
  } else {
    // User is signed out.
    // ...
  }
});

function checkLogin() {
  if (!state.authenticated) {
    $.mobile.navigate("#login");
  }
}

function login(data) {
  firebase
    .auth()
    .signInWithEmailAndPassword(data.email, data.password)
    .then(authData => {
      console.log("login returned", authData);
      setAuthState(authData.user);
      $.mobile.navigate("#list");
    })
    .catch(err => {
      console.warn(err);
    });
}

function register(data) {
  firebase
    .auth()
    .createUserWithEmailAndPassword(data.email, data.password)
    .then(data => {
      state.newUser = {
        name,
        email
      };
    })
    .then(() => {
      login(data);
    })
    .catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // ...
    });
}

function logout() {
  firebase
    .auth()
    .signOut()
    .then(
      function(data) {
        console.log("reg returned", data);
        // Sign-out successful.
        clearUserData();
        setAuthState();
        $.mobile.navigate("#login");
      },
      function(error) {
        // An error happened.
      }
    );
}

/*
$(document).on("mobileinit", function() {
  $.mobile.pushStateEnabled = false;
  console.log("called");
   // We want popups to cover the page behind them with a dark background
   //$.mobile.popup.prototype.options.overlayTheme = "b";
  initLogin();
});
*/

$(document).on("pagebeforeshow", "#login", function() {
  if (state.authenticated) {
    $.mobile.navigate("#list");
  }
  //user adds new task
  $("#loginForm").submit(function(e) {
    e.preventDefault();
    var email = $("#username").val();
    var password = $("#pass").val();
    if (email && password) {
      login({
        email,
        password
      });
    }
    return false;
  });
});

$(document).on("pagebeforeshow", "#register", function() {
  if (state.authenticated) {
    $.mobile.navigate("#list");
  }
  $("#registerForm").submit(function(e) {
    e.preventDefault();
    var name = $("#name").val(),
      email = $("#email").val(),
      password = $("#password").val(),
      password2 = $("#password2").val();

    if (email && password && password === password2) {
      register({
        email: email,
        password: password
      });
    }
  });
});

$(document).on("pagebeforehide", "#list", function() {
  // entering page 1
  if (typeof state.listRef === "object") {
    state.listRef = null;
  }
  state.events = [];
});

$(document).on("pagebeforeshow", "#list", function() {
  checkLogin();
  renderChecklists(state.events); //initial render before data
  //state CRUD functions
  function initList(state, data) {
    state.events = data;
    renderChecklists(state.events);
  }

  function getListItem(id) {
    return state.events.find(function(item) {
      return item.id == id;
    });
  }

  function addList(state, data) {
    state.events.push({
      id: data.id,
      name: data.name,
      description: data.description
    });
    renderChecklists(state.events);
  }

  function updateList(state, data) {
    var item = state.events.find(function(item) {
      return item.id === data.id;
    });
    item.name = data.name;
    item.description = data.description;
    renderChecklists(state.events);
  }

  function removeList(state, id) {
    state.events = state.events.filter(function(item) {
      return item.id !== id;
    });
    renderChecklists(state.events);
  }

  //function to show lists
  function renderChecklists(items = []) {
    if (items.length < 1) {
      $(".empty-checklist").show();
      $("ul.checklist").html("");
    } else {
      $(".empty-checklist").hide();
      var lists = items.map(function(item) {
        return `
        <li data-id="${item.id}">          
          <a href="#" class="task"><span class="trash"></span> ${item.name}</a>
        </li>
		  `;
      });
      $("ul.checklist").html(lists);
      $("ul.checklist").listview("refresh");
    }
  }

  state.listRef = db.ref(`lists`);

  //firebase listeners
  /*
  listRef.once("value", function(snapshot) {
    var checklists = snapshot.val();
    var data = [];
    Object.keys(checklists).forEach(key => {
      data.push({
        id: key,
        ...checklists[key]
      });
    });
    initList(state, data); //push to local state
  });
  */

  state.listRef.on("child_added", function(snapshot) {
    var data = {
      id: snapshot.key,
      name: snapshot.val().name,
      description: snapshot.val().description
    };
    addList(state, data); //push to local state
  });

  state.listRef.on("child_changed", function(snapshot, prevSnap) {
    var data = {
      id: snapshot.key,
      name: snapshot.val().name,
      description: snapshot.val().description
    };
    updateList(state, data); //update local state
  });

  state.listRef.on("child_removed", function(snapshot) {
    removeList(state, snapshot.key); //remove from local state
  });

  //firebase CRUD functions
  function newChecklist(data) {
    state.listRef.push(data);
    $(".newlist").val("");
    $(".desc").val("");
    $("#start").val("");
    $("#time").val("");
  }

  function editChecklist(id, key, value) {
    state.listRef
      .child(id)
      .child(key)
      .set(value);
  }

  function deleteChecklist(id) {
    state.listRef.child(id).remove();
  }

  //user adds new task
  $("#listForm").submit(function(e) {
    e.preventDefault();
    var name = $(".newlist").val();
    var description = $(".desc").val();    
    var start = $("#start").val();
    var time = $("#time").val();
    if (name) {
      newChecklist({ name, description, start, time }); //create new task on server
    }

    return false;
  });

  //show edit input for event
  $("ul.checklist").on("dblclick", "li", function(e) {
    $(this)
      .find(".listitem")
      .attr("readonly", false)
      .focus();
    e.stopImmediatePropagation();
  });

  //user removes event
  $("ul.checklist").on("click", ".trash", function() {
    var id = $(this)
      .parent()
      .attr("data-id");
    deleteChecklist(id);
  });

  //user removes event
  $("ul.checklist").on("change", ".listitem", function() {
    var key = "name";
    var value = $(this).val();
    var id = $(this)
      .parent()
      .parent()
      .attr("data-id");
    editChecklist(id, key, value);
  });

  //user removes events
  $("ul.checklist").on("blur", ".listitem", function() {
    $(this).attr("readonly", true);
  });

  //user clicks on event
  $("#list").on("click", ".task", function(e) {
    e.preventDefault();
    var id = $(this)
      .parent()
      .attr("data-id");
    state.event = getListItem(id);
    //Change page
    $.mobile.navigate("#tasks", {event: getListItem(id)});
  });
});

$(document).on("pagebeforehide", "#tasks", function() {
  // entering page1
  if (typeof state.taskRef === "object") {
    state.taskRef = null;
  }
  state.current = {};
  state.jobs = [];
});

$(document).on("pagebeforeshow", "#tasks", function() {
  checkLogin();
  if (state.event && state.event.name) {
    eventTitle(state.event.name);
  }
  renderTasks(state.jobs); //initial render before data
  
  //state CRUD functions
  function addTask(state, data) {
    state.jobs.push({
      id: data.id,
      task: data.task,
      status: data.status
    });
    renderTasks(state.jobs);
  }

  function getTask(id) {
    return state.jobs.find(function(item) {
      return item.id == id;
    });
  }

  function updateTask(state, data) {
    var item = state.jobs.find(function(item) {
      return item.id === data.id;
    });
    item.status = data.status;
    item.task = data.task;
    renderTasks(state.jobs);
  }

  function removeTask(state, id) {
    state.jobs = state.jobs.filter(function(item) {
      return item.id !== id;
    });
    renderTasks(state.jobs);
  }

  function removeCompletedTask(state) {
    state.jobs.forEach(function(item) {
      if (item.status) {
        deleteTask(item.id);
      }
    });
  }

  //function to show todos
  function renderTasks(items = []) {
    if (items.length < 1) {
      $(".empty-todos").show();
      $("ul.todos").html("");
    } else {
      $(".empty-todos").hide();
      var lists = items.map(function(item) {
        return `
				   <li data-id=${item.id}>
					   <span class=\"trash\"></span>
					   <span class='todoItem'>
						   <input class='check' type=\"checkbox\" ${item.status ? "checked" : ""} />
						   <span class='taskText ${
                 item.status ? "strikethrough" : ""
               }'>${item.task}</span>
					   </span>
				   </li>
			   `;
      });
      $("ul.todos").html(lists);
      $("ul.todos").listview("refresh");
    }
  }
  function eventTitle(title) {
    $("#event-name").html(title);
  }

  state.taskRef = db.ref(`todos/${state.event.id}/items`);

  //firebase listeners
  state.taskRef.on("child_added", function(snapshot) {
    var data = {
      id: snapshot.key,
      task: snapshot.val().task,
      status: snapshot.val().status
    };
    addTask(state, data); //push to local state
  });

  state.taskRef.on("child_changed", function(snapshot, prevSnap) {
    var data = {
      id: snapshot.key,
      task: snapshot.val().task,
      status: snapshot.val().status
    };
    updateTask(state, data); //update local state
  });

  state.taskRef.on("child_removed", function(snapshot) {
    removeTask(state, snapshot.key); //remove from local state
  });

  //firebase CRUD functions
  function newTask(data) {
    state.taskRef.push(data);
    $(".newTask").val("");
  }

  function editTask(id, key, value) {
    state.taskRef
      .child(id)
      .child(key)
      .set(value);
  }

  function deleteTask(id) {
    state.taskRef.child(id).remove();
  }

  //UI interactions

  //user adds new task
  $("#taskForm").submit(function() {
    var input = $(".newTask").val();
    if (input) {
      newTask({ task: input, status: false }); //create new task on server
    }
    return false;
  });

  //show edit input for task
  $("ul.todos").on("dblclick", "li", function(e) {
    var text = $(this)
      .find(".taskText")
      .text();
    $(this).html("<input type='text' class='editTodo'>");
    $(this)
      .find(".editTodo")
      .val(text);
    $(this)
      .find(".editTodo")
      .focus();
    e.stopImmediatePropagation();
  });

  //user edits task name
  $("ul.todos").on("keypress focusout", ".editTodo", function(e) {
    if (e.keyCode && e.keyCode != 13) {
      //if keycode exists, meaning its a keyboard event, and it doesn't equal 13, exit, otherwise it's focusout or 13
      return;
    }
    var value = $(this).val();
    var li = $(this).parent();
    var id = li.attr("data-id");
    var key = "task";
    editTask(id, key, value); //push new name to server
  });

  //user changes status of task
  $("ul.todos").on("click", ".todoItem", function() {
    var item = $(this).parent();
    var id = item.attr("data-id");
    var item = getTask(id);
    var key = "status";
    editTask(id, key, !item.status);
  });

  //user removes task
  $("ul.todos").on("click", ".trash", function() {
    var id = $(this)
      .parent()
      .attr("data-id");
    deleteTask(id);
  });

  //user clears all complete tasks
  $(".delete").on("click", function() {
    removeCompletedTask(state);
  });
});

$(window).on("navigate", function(event, data) {
  console.log(event, data, data.state.event);
  if (data.state.hash == '#tasks' && data.state.event) {    
    //state.event = data.state.event;
  }
  
});

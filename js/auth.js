// ----------------------------
// Authentication Functions
// ----------------------------

// Save new user to localStorage
function signup(username, password) {
  const users = JSON.parse(localStorage.getItem("users")) || [];

  // Check if username already exists
  if (users.find(user => user.username === username)) {
    return { success: false, message: "Username already exists" };
  }

  users.push({ username, password });
  localStorage.setItem("users", JSON.stringify(users));
  return { success: true };
}

// Login existing user with proper warnings
function login(username, password) {
  const users = JSON.parse(localStorage.getItem("users")) || [];

  // Check if username exists
  const userByName = users.find(u => u.username === username);
  if (!userByName) {
    return { success: false, message: "User does not exist. Please sign up first." };
  }

  // Check password
  if (userByName.password === password) {
    localStorage.setItem("currentUser", JSON.stringify(userByName));
    return { success: true };
  } else {
    return { success: false, message: "Incorrect password." };
  }
}

// Logout user
function logout() {
  localStorage.removeItem("currentUser");
}

// Check if user is logged in
function isAuthenticated() {
  return !!localStorage.getItem("currentUser");
}

// ----------------------------
// Login/Signup Form Handling
// ----------------------------

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");
const formTitle = document.getElementById("formTitle");
const loginMessage = document.getElementById("loginMessage");

// Redirect if already logged in
if (isAuthenticated()) {
  window.location.href = "index.html";
}

// Toggle forms
showSignup.addEventListener("click", () => {
  loginForm.style.display = "none";
  signupForm.style.display = "flex";
  formTitle.textContent = "Sign Up";
  loginMessage.textContent = "";
});

showLogin.addEventListener("click", () => {
  signupForm.style.display = "none";
  loginForm.style.display = "flex";
  formTitle.textContent = "Login";
  loginMessage.textContent = "";
});

// Login submit
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;
  const result = login(username, password);
  if (result.success) {
    window.location.href = "index.html";
  } else {
    loginMessage.textContent = result.message;
  }
});

// Signup submit
signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("signupUsername").value;
  const password = document.getElementById("signupPassword").value;
  const result = signup(username, password);
  if (result.success) {
    loginMessage.textContent = "Account created! You can login now.";
    loginMessage.classList.add("success");
    signupForm.style.display = "none";
    loginForm.style.display = "flex";
    formTitle.textContent = "Login";
  } else {
    loginMessage.textContent = result.message;
    loginMessage.classList.remove("success"); 
  }
});

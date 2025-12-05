// validation form register and register user local storage
const inputUsernameRegister = document.querySelector("#name");
const inputPasswordRegister = document.querySelector("#password");
const btnRegister = document.querySelector("#register");

// validation form register and register user local storage

btnRegister.addEventListener("click", (e) => {
  e.preventDefault();
  if (
    inputUsernameRegister.value === ""  ||	 
    inputPasswordRegister.value === ""
  ) {
    alert("vui lòng không để trống ô nào");
  } else {
    // array user
    const user = {
      username: inputUsernameRegister.value,
      password: inputPasswordRegister.value,
    };
    let json = JSON.stringify(user);
    localStorage.setItem(inputUsernameRegister.value, json);
    alert("Đăng Ký Thành Công");
    window.location.href = "login.html";
  }
});
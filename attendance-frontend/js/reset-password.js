const params =
    new URLSearchParams(window.location.search);

const token =
    params.get("token");

const passwordInput =
    document.getElementById("password");

const resetBtn =
    document.getElementById("resetBtn");

const messageBox =
    document.getElementById("messageBox");

function showMessage(message, type) {

    messageBox.style.display = "block";

    messageBox.className =
        `message ${type}`;

    messageBox.textContent = message;
}

resetBtn.addEventListener("click", async () => {

    const password =
        passwordInput.value.trim();

    if (!password) {

        showMessage(
            "Please enter a password",
            "error"
        );

        return;
    }

    if (password.length < 6) {

        showMessage(
            "Password must be at least 6 characters",
            "error"
        );

        return;
    }

    try {

        resetBtn.disabled = true;
        resetBtn.textContent = "Resetting...";

        const response =
            await API.resetPassword(
                token,
                password
            );

        showMessage(
            response.message ||
            "Password reset successful",
            "success"
        );

        setTimeout(() => {

            window.location.href =
                "employee-login.html";

        }, 2000);

    } catch (error) {

        showMessage(
            error.message ||
            "Something went wrong",
            "error"
        );

    } finally {

        resetBtn.disabled = false;
        resetBtn.textContent =
            "Reset Password";
    }
});
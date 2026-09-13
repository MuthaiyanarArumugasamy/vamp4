function openLogin() {
    document.getElementById("loginModal").style.display = "flex";
}

function closeLogin() {
    document.getElementById("loginModal").style.display = "none";
}

function login() {
    alert("Login system will be connected in the next step.");
}

function startSelling() {
    alert("Seller registration will be added soon.");
}

function explore() {
    document.getElementById("categories").scrollIntoView({
        behavior: "smooth"
    });
}

function viewJobs() {
    alert("Job marketplace will be added in the next step.");
}

function category(name) {
    alert("You selected: " + name);
}

function searchItems() {

    const search =
        document.getElementById("searchInput").value.trim();

    if (search === "") {
        alert("Please enter something to search.");
        return;
    }

    alert("Searching Vamp4 for: " + search);
}

window.onclick = function(event) {

    const modal =
        document.getElementById("loginModal");

    if (event.target === modal) {
        closeLogin();
    }

};

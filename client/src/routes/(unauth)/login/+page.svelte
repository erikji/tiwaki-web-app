<div class="centered">
    <div class="widget">
        <img src="/tiwaki.png" alt="tiwaki logo"/>
        <h1>Log In</h1>
        <form method="POST" action='/api/login'>
            <input name="username" type="text" required />
            <input name="password" type="password" required />
            <input type="submit" value="Submit" />
        </form>
    </div>
</div>

<style>
.centered {
    width: 100%;
    height: 80%;
    display: flex;
    justify-content: center;
    align-items: center;
}
.widget {
    width: min-content;
    height: min-content;
    padding: 10px;
    display: flex;
    flex-direction: column;
    background-color: white;
    box-shadow: rgb(50, 50, 50) 0 0 30px;
    border-radius: 20px;
    transition: 100ms linear box-shadow, 200ms ease-out transform;
    text-align: center;
}
.widget:hover {
    box-shadow: black 0 0 30px;
    transform: translateY(5px);
}
form {
    display: flex;
    flex-direction: column;
    align-items: center;
}

input {
    border: 2px solid black;
    border-radius: 8px;
    margin: 4px;
    transition: 200ms linear box-shadow;
}

input:hover {
    box-shadow: black 0 0 5px;
}

input[type="submit"] {
    width: min-content;
}

input[type="submit"]:hover {
    cursor: grab;
}
</style>
let selectedRow = null;

document.addEventListener("DOMContentLoaded", function () {
    loadSavedData(); // Cargar datos guardados al inicio
});

function selectRow(event) {
    if (selectedRow) {
        selectedRow.style.backgroundColor = "black";
    }
    selectedRow = event.target.parentNode;
    selectedRow.style.backgroundColor = "#333";
}

function addPoints(points) {
    if (selectedRow) {
        let cell = selectedRow.cells[2]; // Columna de puntos
        let newScore = parseInt(cell.innerText || 0) + points;
        cell.innerText = newScore;
        saveData();
    }
}

function addFoul() {
    if (selectedRow) {
        let cell = selectedRow.cells[3]; // Columna de faltas
        let newFouls = parseInt(cell.innerText || 0) + 1;
        cell.innerText = newFouls;
        saveData();
    }
}

function saveData() {
    let tableData = [];
    let rows = document.querySelectorAll("table tbody tr");

    rows.forEach(row => {
        let cells = row.cells;
        tableData.push({
            name: cells[0].innerText, // Nombre del jugador
            number: cells[1].innerText, // Número del jugador
            points: cells[2].innerText, // Puntos
            fouls: cells[3].innerText  // Faltas
        });
    });

    localStorage.setItem("matchData", JSON.stringify(tableData));
}

function loadSavedData() {
    let savedData = localStorage.getItem("matchData");
    if (savedData) {
        let tableData = JSON.parse(savedData);
        let rows = document.querySelectorAll("table tbody tr");

        tableData.forEach((data, index) => {
            if (rows[index]) {
                let cells = rows[index].cells;
                cells[0].innerText = data.name;
                cells[1].innerText = data.number;
                cells[2].innerText = data.points;
                cells[3].innerText = data.fouls;
            }
        });
    }
}

window.addEventListener('beforeunload', function (e) {
    e.preventDefault();
    e.returnValue = 'Los datos del partido se perderán si recargas o cierras la página.';
});
function startMatch() {
    let match = document.getElementById("match").value;

    if (match === "Seleccionar") {
        alert("Por favor, selecciona un partido antes de iniciar.");
        return;
    }

    // Dividir la opción seleccionada en Equipo A y Equipo B
    let teams = match.split(" vs ");
    document.getElementById("teamALabel").innerText = `Tabla Local - ${teams[0]}`;
    document.getElementById("teamBLabel").innerText = `Tabla Visitante - ${teams[1]}`;
}
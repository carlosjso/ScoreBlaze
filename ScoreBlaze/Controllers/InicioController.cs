using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ScoreBlaze.Models;

namespace ScoreBlaze.Controllers;

public class InicioController : Controller
{
    private readonly ILogger<InicioController> _logger;

    public InicioController(ILogger<InicioController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        return View("~/Views/Inicio.cshtml");
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}

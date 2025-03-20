using Microsoft.AspNetCore.Mvc;

namespace ScoreBlaze.Controllers
{
    public class RegistroJugadorController : Controller
    {
        public IActionResult Index()
        {
            return View("~/Views/RegistroJugador.cshtml");
        }
    }
}

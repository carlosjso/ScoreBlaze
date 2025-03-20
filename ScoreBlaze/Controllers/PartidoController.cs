using Microsoft.AspNetCore.Mvc;

namespace ScoreBlaze.Controllers
{
    public class PartidoController : Controller
    {
        public IActionResult Index()
        {
            return View("~/Views/Partido.cshtml");

        }
    }
}

using Microsoft.AspNetCore.Mvc;

namespace ScoreBlaze.Controllers
{
    public class RegistroPartidoController : Controller
    {
        public IActionResult Index()
        {
            return View("~/Views/RegistroPartido.cshtml");
        }
    }
}

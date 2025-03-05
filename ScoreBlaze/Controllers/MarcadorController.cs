using Microsoft.AspNetCore.Mvc;

namespace ScoreBlaze.Controllers
{
    public class MarcadorController : Controller
    {
        public IActionResult Index()
        {
            return View("~/Views/Marcador.cshtml");
        }
    }
}

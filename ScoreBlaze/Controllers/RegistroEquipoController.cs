using Microsoft.AspNetCore.Mvc;

namespace ScoreBlaze.Controllers
{
    public class RegistroEquipoController : Controller
    {
        public IActionResult Index()
        {
            return View("~/Views/RegistroEquipo.cshtml");
        }
    }
}

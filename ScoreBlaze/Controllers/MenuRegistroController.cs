using Microsoft.AspNetCore.Mvc;

namespace ScoreBlaze.Controllers
{
    public class MenuRegistroController : Controller
    {
        public IActionResult Index()
        {
            return View("~/Views/MenuRegistro.cshtml");
        }
    }
}

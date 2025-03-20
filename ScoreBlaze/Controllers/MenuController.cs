using Microsoft.AspNetCore.Mvc;

namespace ScoreBlaze.Controllers
{
    public class MenuController : Controller
    {
        public IActionResult Index()
        {
            return View("~/Views/Menu.cshtml");
        }
    }
}

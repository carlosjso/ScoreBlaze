using Microsoft.AspNetCore.Mvc;

namespace ScoreBlaze.Controllers
{
    public class MenuBasquetbolController : Controller
    {
        public IActionResult Index()
        {
            return View("~/Views/MenuBasquetbol.cshtml");
        }
    }
}

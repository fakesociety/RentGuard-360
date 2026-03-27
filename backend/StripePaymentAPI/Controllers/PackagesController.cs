using Microsoft.AspNetCore.Mvc;
using StripePaymentAPI.Models;
using StripePaymentAPI.Repositories;

namespace StripePaymentAPI.Controllers
{
    /// <summary>
    /// PackagesController - Handles subscription package queries.
    /// Inherits from ControllerBase and uses [ApiController] as taught in the course.
    /// The IPaymentRepository is injected via Dependency Injection (constructor).
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class PackagesController : ControllerBase
    {
        // Repository injected via DI - the controller never creates it with 'new'
        private readonly IPaymentRepository _repository;

        /// <summary>
        /// Constructor - receives the repository via Dependency Injection.
        /// Registered in Program.cs: builder.Services.AddScoped<IPaymentRepository, SQLPaymentRepository>()
        /// </summary>
        public PackagesController(IPaymentRepository repository)
        {
            _repository = repository;
        }

        // =====================================================================
        // GET api/packages
        // Returns all active subscription packages
        // =====================================================================

        /// <summary>
        /// Retrieves all active subscription packages.
        /// </summary>
        /// <returns>List of packages with 200 OK, or 400 BadRequest on error</returns>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult GetAllPackages()
        {
            try
            {
                List<Package> packages = _repository.GetAllPackages();
                return Ok(packages);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // =====================================================================
        // GET api/packages/{id}
        // Returns a specific package by ID
        // =====================================================================

        /// <summary>
        /// Retrieves a specific package by its ID.
        /// Uses route constraint {id:int:min(1)} to ensure valid ID.
        /// </summary>
        /// <param name="id">Package ID (must be a positive integer)</param>
        /// <returns>Package with 200 OK, 404 NotFound, or 400 BadRequest</returns>
        [HttpGet("{id:int:min(1)}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult GetPackageById(int id)
        {
            try
            {
                Package package = _repository.GetPackageById(id);

                if (package == null)
                {
                    return NotFound(new { error = $"Package with ID {id} was not found" });
                }

                return Ok(package);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // =====================================================================
        // GET api/packages/{name}
        // Returns a specific package by string name/slug (e.g., 'basic', 'pro')
        // =====================================================================

        /// <summary>
        /// Retrieves a specific package by its string name (slug).
        /// Fallback for React frontend that uses string package IDs.
        /// </summary>
        /// <param name="name">Package name/slug (e.g., 'basic', 'pro', 'free')</param>
        /// <returns>Package with 200 OK, 404 NotFound, or 400 BadRequest</returns>
        [HttpGet("{name}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult GetPackageByName(string name)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(name))
                {
                    return BadRequest(new { error = "Package name cannot be empty" });
                }

                List<Package> packages = _repository.GetAllPackages();
                
                // Case-insensitive lookup by package name
                Package package = packages.FirstOrDefault(p => 
                    p.Name?.ToLower() == name.ToLower());

                if (package == null)
                {
                    return NotFound(new { error = $"Package '{name}' was not found" });
                }

                return Ok(package);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}

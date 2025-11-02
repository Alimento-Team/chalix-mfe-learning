// Compatibility shim (CommonJS) that imports the real auth module using
// the build-time alias '@edx/frontend-platform/auth-original' so we avoid
// circular aliasing. Webpack will replace the require calls at bundle time.
let real;
try {
	// Prefer the resolved original module path provided by the webpack config.
	real = require('@edx/frontend-platform/auth-original');
} catch (e) {
	// Fallback to the standard module name if the alias wasn't created.
	real = require('@edx/frontend-platform/auth');
}

// Copy all real exports
Object.keys(real).forEach((k) => {
	exports[k] = real[k];
});

// Provide aliases for older API names expected by Chalix
exports.getAuthenticatedAPIClient = real.getAuthenticatedAPIClient || real.getAuthenticatedHttpClient;
exports.getAuthenticatedHttpClient = real.getAuthenticatedHttpClient || real.getAuthenticatedAPIClient;
exports.getLoginRedirectUrl = real.getLoginRedirectUrl || null;
exports.getAuthenticatedUser = real.getAuthenticatedUser || (() => null);

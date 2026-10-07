## Laravel Fortify

Fortify is a headless authentication backend that provides authentication routes and controllers for Laravel applications.

**Before implementing any authentication features, use the ___SINGLE_BACKTICK___search-docs___SINGLE_BACKTICK___ tool to get the latest docs for that specific feature.**

### Configuration & Setup
- Check ___SINGLE_BACKTICK___config/fortify.php___SINGLE_BACKTICK___ to see what's enabled. Use ___SINGLE_BACKTICK___search-docs___SINGLE_BACKTICK___ for detailed information on specific features.
- Enable features by adding them to the ___SINGLE_BACKTICK___'features' => []___SINGLE_BACKTICK___ array: ___SINGLE_BACKTICK___Features::registration()___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___Features::resetPasswords()___SINGLE_BACKTICK___, etc.
- To see the all Fortify registered routes, use the ___SINGLE_BACKTICK___list-routes___SINGLE_BACKTICK___ tool with the ___SINGLE_BACKTICK___only_vendor: true___SINGLE_BACKTICK___ and ___SINGLE_BACKTICK___action: "Fortify"___SINGLE_BACKTICK___ parameters.
- Fortify includes view routes by default (login, register). Set ___SINGLE_BACKTICK___'views' => false___SINGLE_BACKTICK___ in the configuration file to disable them if you're handling views yourself.

### Customization
- Views can be customized in ___SINGLE_BACKTICK___FortifyServiceProvider___SINGLE_BACKTICK___'s ___SINGLE_BACKTICK___boot()___SINGLE_BACKTICK___ method using ___SINGLE_BACKTICK___Fortify::loginView()___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___Fortify::registerView()___SINGLE_BACKTICK___, etc.
- Customize authentication logic with ___SINGLE_BACKTICK___Fortify::authenticateUsing()___SINGLE_BACKTICK___ for custom user retrieval / validation.
- Actions in ___SINGLE_BACKTICK___app/Actions/Fortify/___SINGLE_BACKTICK___ handle business logic (user creation, password reset, etc.). They're fully customizable, so you can modify them to change feature behavior.

## Available Features
- ___SINGLE_BACKTICK___Features::registration()___SINGLE_BACKTICK___ for user registration.
- ___SINGLE_BACKTICK___Features::emailVerification()___SINGLE_BACKTICK___ to verify new user emails.
- ___SINGLE_BACKTICK___Features::twoFactorAuthentication()___SINGLE_BACKTICK___ for 2FA with QR codes and recovery codes.
  - Add options: ___SINGLE_BACKTICK___['confirmPassword' => true, 'confirm' => true]___SINGLE_BACKTICK___ to require password confirmation and OTP confirmation before enabling 2FA.
- ___SINGLE_BACKTICK___Features::updateProfileInformation()___SINGLE_BACKTICK___ to let users update their profile.
- ___SINGLE_BACKTICK___Features::updatePasswords()___SINGLE_BACKTICK___ to let users change their passwords.
- ___SINGLE_BACKTICK___Features::resetPasswords()___SINGLE_BACKTICK___ for password reset via email.

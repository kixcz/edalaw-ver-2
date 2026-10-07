## PHP

<?php
/** @var \Laravel\Boost\Install\GuidelineAssist $assist */
?>
<?php if($assist->shouldEnforceStrictTypes()): ?>
- Always use strict typing at the head of a ___SINGLE_BACKTICK___.php___SINGLE_BACKTICK___ file: ___SINGLE_BACKTICK___declare(strict_types=1);___SINGLE_BACKTICK___.
<?php endif; ?>
- Always use curly braces for control structures, even if it has one line.

### Constructors
- Use PHP 8 constructor property promotion in ___SINGLE_BACKTICK_____construct()___SINGLE_BACKTICK___.
    - <code-snippet>public function __construct(public GitHub $github) { }</code-snippet>
- Do not allow empty ___SINGLE_BACKTICK_____construct()___SINGLE_BACKTICK___ methods with zero parameters unless the constructor is private.

### Type Declarations
- Always use explicit return type declarations for methods and functions.
- Use appropriate PHP type hints for method parameters.

<code-snippet name="Explicit Return Types and Method Params" lang="php">
protected function isAccessible(User $user, ?string $path = null): bool
{
    ...
}
</code-snippet>

## Comments
- Prefer PHPDoc blocks over inline comments. Never use comments within the code itself unless there is something very complex going on.

## PHPDoc Blocks
- Add useful array shape type definitions for arrays when appropriate.

## Enums
<?php if(empty($assist->enums()) || preg_match('/[A-Z]{3,8}/', $assist->enumContents())): ?>
- Typically, keys in an Enum should be TitleCase. For example: ___SINGLE_BACKTICK___FavoritePerson___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___BestLake___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___Monthly___SINGLE_BACKTICK___.
<?php else: ?>
- That being said, keys in an Enum should follow existing application Enum conventions.
<?php endif; ?>
<?php /**PATH D:\SANDBOX\web app\eDalaw\edalaw-ver-2\storage\framework\views/4dfbefc49c0d178cf9d34bf48b1a21ce.blade.php ENDPATH**/ ?>
@php
/** @var \Laravel\Boost\Install\GuidelineAssist $assist */
@endphp
## Laravel Pint Code Formatter

- You must run ___SINGLE_BACKTICK___{{ $assist->binCommand('pint') }} --dirty___SINGLE_BACKTICK___ before finalizing changes to ensure your code matches the project's expected style.
- Do not run ___SINGLE_BACKTICK___{{ $assist->binCommand('pint') }} --test___SINGLE_BACKTICK___, simply run ___SINGLE_BACKTICK___{{ $assist->binCommand('pint') }}___SINGLE_BACKTICK___ to fix any formatting issues.

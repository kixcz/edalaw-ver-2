## Tailwind CSS 4

- Always use Tailwind CSS v4; do not use the deprecated utilities.
- ___SINGLE_BACKTICK___corePlugins___SINGLE_BACKTICK___ is not supported in Tailwind v4.
- In Tailwind v4, configuration is CSS-first using the ___SINGLE_BACKTICK___@theme___SINGLE_BACKTICK___ directive — no separate ___SINGLE_BACKTICK___tailwind.config.js___SINGLE_BACKTICK___ file is needed.

<code-snippet name="Extending Theme in CSS" lang="css">
@theme {
  --color-brand: oklch(0.72 0.11 178);
}
</code-snippet>

- In Tailwind v4, you import Tailwind using a regular CSS ___SINGLE_BACKTICK___@import___SINGLE_BACKTICK___ statement, not using the ___SINGLE_BACKTICK___@tailwind___SINGLE_BACKTICK___ directives used in v3:

<code-snippet name="Tailwind v4 Import Tailwind Diff" lang="diff">
   - @tailwind base;
   - @tailwind components;
   - @tailwind utilities;
   + @import "tailwindcss";
</code-snippet>


### Replaced Utilities
- Tailwind v4 removed deprecated utilities. Do not use the deprecated option; use the replacement.
- Opacity values are still numeric.

| Deprecated |	Replacement |
|------------+--------------|
| bg-opacity-* | bg-black/* |
| text-opacity-* | text-black/* |
| border-opacity-* | border-black/* |
| divide-opacity-* | divide-black/* |
| ring-opacity-* | ring-black/* |
| placeholder-opacity-* | placeholder-black/* |
| flex-shrink-* | shrink-* |
| flex-grow-* | grow-* |
| overflow-ellipsis | text-ellipsis |
| decoration-slice | box-decoration-slice |
| decoration-clone | box-decoration-clone |
<?php /**PATH D:\SANDBOX\web app\eDalaw\edalaw-ver-2\storage\framework\views/0ce8bae30cecbb8b1ca4cfd95255ae5c.blade.php ENDPATH**/ ?>
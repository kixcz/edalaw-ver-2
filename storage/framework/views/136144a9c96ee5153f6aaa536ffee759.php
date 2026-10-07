## Tailwind CSS

- Use Tailwind CSS classes to style HTML; check and use existing Tailwind conventions within the project before writing your own.
- Offer to extract repeated patterns into components that match the project's conventions (i.e. Blade, JSX, Vue, etc.).
- Think through class placement, order, priority, and defaults. Remove redundant classes, add classes to parent or child carefully to limit repetition, and group elements logically.
- You can use the ___SINGLE_BACKTICK___search-docs___SINGLE_BACKTICK___ tool to get exact examples from the official documentation when needed.

### Spacing
- When listing items, use gap utilities for spacing; don't use margins.

<code-snippet name="Valid Flex Gap Spacing Example" lang="html">
    <div class="flex gap-8">
        <div>Superior</div>
        <div>Michigan</div>
        <div>Erie</div>
    </div>
</code-snippet>


### Dark Mode
- If existing pages and components support dark mode, new pages and components must support dark mode in a similar way, typically using ___SINGLE_BACKTICK___dark:___SINGLE_BACKTICK___.
<?php /**PATH D:\SANDBOX\web app\eDalaw\edalaw-ver-2\storage\framework\views/a6a42abee211dc32f4947908f2782a36.blade.php ENDPATH**/ ?>
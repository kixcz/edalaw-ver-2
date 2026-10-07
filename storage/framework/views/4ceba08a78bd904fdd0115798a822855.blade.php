@php
/** @var \Laravel\Boost\Install\GuidelineAssist $assist */
@endphp
## Laravel Wayfinder

Wayfinder generates TypeScript functions and types for Laravel controllers and routes which you can import into your client-side code. It provides type safety and automatic synchronization between backend routes and frontend code.

### Development Guidelines
- Always use the ___SINGLE_BACKTICK___search-docs___SINGLE_BACKTICK___ tool to check Wayfinder correct usage before implementing any features.
- Always prefer named imports for tree-shaking (e.g., ___SINGLE_BACKTICK___import { show } from '@/actions/...'___SINGLE_BACKTICK___).
- Avoid default controller imports (prevents tree-shaking).
- Run ___SINGLE_BACKTICK___{{ $assist->artisanCommand('wayfinder:generate') }}___SINGLE_BACKTICK___ after route changes if Vite plugin isn't installed.

### Feature Overview
- Form Support: Use ___SINGLE_BACKTICK___.form()___SINGLE_BACKTICK___ with ___SINGLE_BACKTICK___--with-form___SINGLE_BACKTICK___ flag for HTML form attributes — ___SINGLE_BACKTICK___<form {...store.form()}>___SINGLE_BACKTICK___ → ___SINGLE_BACKTICK___action="/posts" method="post"___SINGLE_BACKTICK___.
- HTTP Methods: Call ___SINGLE_BACKTICK___.get()___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___.post()___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___.patch()___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___.put()___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___.delete()___SINGLE_BACKTICK___ for specific methods — ___SINGLE_BACKTICK___show.head(1)___SINGLE_BACKTICK___ → ___SINGLE_BACKTICK___{ url: "/posts/1", method: "head" }___SINGLE_BACKTICK___.
- Invokable Controllers: Import and invoke directly as functions. For example, ___SINGLE_BACKTICK___import StorePost from '@/actions/.../StorePostController'; StorePost()___SINGLE_BACKTICK___.
- Named Routes: Import from ___SINGLE_BACKTICK___@/routes/___SINGLE_BACKTICK___ for non-controller routes. For example, ___SINGLE_BACKTICK___import { show } from '@/routes/post'; show(1)___SINGLE_BACKTICK___ for route name ___SINGLE_BACKTICK___post.show___SINGLE_BACKTICK___.
- Parameter Binding: Detects route keys (e.g., ___SINGLE_BACKTICK___{post:slug}___SINGLE_BACKTICK___) and accepts matching object properties — ___SINGLE_BACKTICK___show("my-post")___SINGLE_BACKTICK___ or ___SINGLE_BACKTICK___show({ slug: "my-post" })___SINGLE_BACKTICK___.
- Query Merging: Use ___SINGLE_BACKTICK___mergeQuery___SINGLE_BACKTICK___ to merge with ___SINGLE_BACKTICK___window.location.search___SINGLE_BACKTICK___, set values to ___SINGLE_BACKTICK___null___SINGLE_BACKTICK___ to remove — ___SINGLE_BACKTICK___show(1, { mergeQuery: { page: 2, sort: null } })___SINGLE_BACKTICK___.
- Query Parameters: Pass ___SINGLE_BACKTICK___{ query: {...} }___SINGLE_BACKTICK___ in options to append params — ___SINGLE_BACKTICK___show(1, { query: { page: 1 } })___SINGLE_BACKTICK___ → ___SINGLE_BACKTICK___"/posts/1?page=1"___SINGLE_BACKTICK___.
- Route Objects: Functions return ___SINGLE_BACKTICK___{ url, method }___SINGLE_BACKTICK___ shaped objects — ___SINGLE_BACKTICK___show(1)___SINGLE_BACKTICK___ → ___SINGLE_BACKTICK___{ url: "/posts/1", method: "get" }___SINGLE_BACKTICK___.
- URL Extraction: Use ___SINGLE_BACKTICK___.url()___SINGLE_BACKTICK___ to get URL string — ___SINGLE_BACKTICK___show.url(1)___SINGLE_BACKTICK___ → ___SINGLE_BACKTICK___"/posts/1"___SINGLE_BACKTICK___.

### Example Usage
@verbatim
<code-snippet name="Wayfinder Basic Usage" lang="typescript">
    // Import controller methods (tree-shakable)...
    import { show, store, update } from '@/actions/App/Http/Controllers/PostController'

    // Get route object with URL and method...
    show(1) // { url: "/posts/1", method: "get" }

    // Get just the URL...
    show.url(1) // "/posts/1"

    // Use specific HTTP methods...
    show.get(1) // { url: "/posts/1", method: "get" }
    show.head(1) // { url: "/posts/1", method: "head" }

    // Import named routes...
    import { show as postShow } from '@/routes/post' // For route name 'post.show'
    postShow(1) // { url: "/posts/1", method: "get" }
</code-snippet>
@endverbatim

@if($assist->roster->uses(\Laravel\Roster\Enums\Packages::INERTIA_LARAVEL) || $assist->roster->uses(\Laravel\Roster\Enums\Packages::INERTIA_REACT) || $assist->roster->uses(\Laravel\Roster\Enums\Packages::INERTIA_VUE) || $assist->roster->uses(\Laravel\Roster\Enums\Packages::INERTIA_SVELTE))
### Wayfinder + Inertia
@if($assist->inertia()->hasFormComponent())
If your application uses the ___SINGLE_BACKTICK___<Form>___SINGLE_BACKTICK___ component from Inertia, you can use Wayfinder to generate form action and method automatically.
@if($assist->roster->uses(\Laravel\Roster\Enums\Packages::INERTIA_REACT))
___BOOST_SNIPPET_0___
@endif
@if($assist->roster->uses(\Laravel\Roster\Enums\Packages::INERTIA_VUE))
___BOOST_SNIPPET_1___
@endif
@if($assist->roster->uses(\Laravel\Roster\Enums\Packages::INERTIA_SVELTE))
___BOOST_SNIPPET_2___
@endif
@else
If your application uses the ___SINGLE_BACKTICK___useForm___SINGLE_BACKTICK___ component from Inertia, you can directly submit to the Wayfinder generated functions.

<code-snippet name="Wayfinder useForm Example" lang="typescript">
    import { store } from "@/actions/App/Http/Controllers/ExampleController";

    const form = useForm({
        name: "My Big Post",
    });

    form.submit(store());
</code-snippet>
@endif
@endif

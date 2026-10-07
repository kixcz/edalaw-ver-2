## Inertia v2

- Make use of all Inertia features from v1 and v2. Check the documentation before making any changes to ensure we are taking the correct approach.

### Inertia v2 New Features
- Deferred props.
- Infinite scrolling using merging props and ___SINGLE_BACKTICK___WhenVisible___SINGLE_BACKTICK___.
- Lazy loading data on scroll.
- Polling.
- Prefetching.

### Deferred Props & Empty States
- When using deferred props on the frontend, you should add a nice empty state with pulsing/animated skeleton.

### Inertia Form General Guidance
@if ($assist->inertia()->hasFormComponent())
- The recommended way to build forms when using Inertia is with the ___SINGLE_BACKTICK___<Form>___SINGLE_BACKTICK___ component - a useful example is below. Use the ___SINGLE_BACKTICK___search-docs___SINGLE_BACKTICK___ tool with a query of ___SINGLE_BACKTICK___form component___SINGLE_BACKTICK___ for guidance.
- Forms can also be built using the ___SINGLE_BACKTICK___useForm___SINGLE_BACKTICK___ helper for more programmatic control, or to follow existing conventions. Use the ___SINGLE_BACKTICK___search-docs___SINGLE_BACKTICK___ tool with a query of ___SINGLE_BACKTICK___useForm helper___SINGLE_BACKTICK___ for guidance.
@if ($assist->inertia()->hasFormComponentResets())
- ___SINGLE_BACKTICK___resetOnError___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___resetOnSuccess___SINGLE_BACKTICK___, and ___SINGLE_BACKTICK___setDefaultsOnSuccess___SINGLE_BACKTICK___ are available on the ___SINGLE_BACKTICK___<Form>___SINGLE_BACKTICK___ component. Use the ___SINGLE_BACKTICK___search-docs___SINGLE_BACKTICK___ tool with a query of ___SINGLE_BACKTICK___form component resetting___SINGLE_BACKTICK___ for guidance.
@else
- This version of Inertia does not support ___SINGLE_BACKTICK___resetOnError___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___resetOnSuccess___SINGLE_BACKTICK___, or ___SINGLE_BACKTICK___setDefaultsOnSuccess___SINGLE_BACKTICK___ on the ___SINGLE_BACKTICK___<Form>___SINGLE_BACKTICK___ component. Using these will cause errors.
@endif
@else
- Build forms using the ___SINGLE_BACKTICK___useForm___SINGLE_BACKTICK___ helper. Use the code examples and the ___SINGLE_BACKTICK___search-docs___SINGLE_BACKTICK___ tool with a query of ___SINGLE_BACKTICK___useForm helper___SINGLE_BACKTICK___ for guidance.
@endif

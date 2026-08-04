<!DOCTYPE html>
<html lang="<?php echo e(str_replace('_', '-', app()->getLocale())); ?>" class="<?php echo \Illuminate\Support\Arr::toCssClasses(['dark' => ($appearance ?? 'system') == 'dark', 'theme-' . ($themeColor ?? 'blue')]); ?>">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">

        
        <script>
            (function() {
                const appearance = '<?php echo e($appearance ?? "system"); ?>';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>
        
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <title><?php echo $__env->yieldContent('title', config('app.name', 'Laravel')); ?></title>

        <link rel="icon" href="/edalaw_logo.png" type="image/png">
        <link rel="shortcut icon" href="/edalaw_logo.png" type="image/png">
        <link rel="apple-touch-icon" href="/edalaw_logo.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=poppins:400,500,600,700" rel="stylesheet" />

        <?php echo app('Illuminate\Foundation\Vite')(['resources/css/app.css', 'resources/js/app.tsx']); ?>
        
        <?php echo $__env->yieldPushContent('styles'); ?>
    </head>
    <body class="font-sans antialiased bg-gray-50 dark:bg-gray-900">
        <!-- Navigation -->
        <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <a href="<?php echo e(route('dashboard.visitor')); ?>" class="flex items-center space-x-2">
                            <img src="/edalaw_logo.png" alt="eDalaw Logo" class="h-8 w-8">
                            <span class="font-semibold text-xl text-gray-900 dark:text-white"><?php echo e(config('app.name', 'eDalaw')); ?></span>
                        </a>
                    </div>
                    
                    <div class="flex items-center space-x-4">
                        <?php if(auth()->guard()->check()): ?>
                            <span class="text-sm text-gray-700 dark:text-gray-300"><?php echo e(auth()->user()->name); ?></span>
                            <form method="POST" action="<?php echo e(route('logout')); ?>" class="inline">
                                <?php echo csrf_field(); ?>
                                <button type="submit" class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                    Logout
                                </button>
                            </form>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Page Heading -->
        <?php if(isset($header)): ?>
            <header class="bg-white dark:bg-gray-800 shadow">
                <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <?php echo e($header); ?>

                </div>
            </header>
        <?php endif; ?>

        <!-- Page Content -->
        <main>
            <?php echo $__env->yieldContent('content'); ?>
        </main>

        <!-- Privacy Notice Footer -->
        <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <p class="text-xs text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                    Personal information collected through this system is processed in accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and will be used only for legitimate, authorized, and proportionate purposes related to the operation of the eDalaw system.
                </p>
            </div>
        </footer>

        <?php echo $__env->yieldPushContent('scripts'); ?>
    </body>
</html>
<?php /**PATH C:\Users\panal\Documents\projects\edalaw (defective)\resources\views/layouts/visitor.blade.php ENDPATH**/ ?>
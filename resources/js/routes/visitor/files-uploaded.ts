import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Visitor\FilesUploadedController::index
 * @see app/Http/Controllers/Visitor/FilesUploadedController.php:18
 * @route '/visitor/files-uploaded'
 */
const filesUploaded = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: filesUploaded.url(options),
    method: 'get',
})

filesUploaded.definition = {
    methods: ["get","head"],
    url: '/visitor/files-uploaded',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Visitor\FilesUploadedController::index
 * @see app/Http/Controllers/Visitor/FilesUploadedController.php:18
 * @route '/visitor/files-uploaded'
 */
filesUploaded.url = (options?: RouteQueryOptions) => {
    return filesUploaded.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Visitor\FilesUploadedController::index
 * @see app/Http/Controllers/Visitor/FilesUploadedController.php:18
 * @route '/visitor/files-uploaded'
 */
filesUploaded.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: filesUploaded.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Visitor\FilesUploadedController::index
 * @see app/Http/Controllers/Visitor/FilesUploadedController.php:18
 * @route '/visitor/files-uploaded'
 */
filesUploaded.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: filesUploaded.url(options),
    method: 'head',
})
export default filesUploaded

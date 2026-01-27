// Vue App with Router
const { createApp } = Vue;

// Simple hash-based router
class SimpleRouter {
    constructor(routes) {
        this.routes = routes;
        this.currentRoute = { name: 'home', params: {} };
        this.component = null;
        
        window.addEventListener('hashchange', () => {
            this.parseRoute();
        });
        
        // Parse initial route
        this.parseRoute();
    }
    
    parseRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const [path, queryString] = hash.split('?');
        
        // Find matching route
        const route = this.routes.find(r => {
            if (r.path === path) return true;
            // Handle dynamic routes (basic implementation)
            const pathParts = path.split('/');
            const routeParts = r.path.split('/');
            if (pathParts.length === routeParts.length) {
                return routeParts.every((part, i) => 
                    part.startsWith(':') || part === pathParts[i]
                );
            }
            return false;
        });
        
        if (route) {
            // Parse params from query string
            const params = {};
            if (queryString) {
                queryString.split('&').forEach(pair => {
                    const [key, value] = pair.split('=');
                    params[decodeURIComponent(key)] = decodeURIComponent(value);
                });
            }
            
            this.currentRoute = {
                name: route.name,
                params: params,
                path: path
            };
            this.component = route.component;
        } else {
            // Default to home
            this.currentRoute = { name: 'home', params: {}, path: '/' };
            this.component = HomePage;
        }
    }
    
    push(options) {
        if (typeof options === 'string') {
            window.location.hash = options;
        } else if (options.name) {
            // Find route by name
            const route = this.routes.find(r => r.name === options.name);
            if (route) {
                let path = route.path;
                
                // Build query string from params
                if (options.params && Object.keys(options.params).length > 0) {
                    const queryParams = Object.entries(options.params)
                        .map(([key, value]) => 
                            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
                        )
                        .join('&');
                    path += '?' + queryParams;
                }
                
                window.location.hash = path;
            }
        }
    }
}

// Define routes
const routes = [
    { path: '/', name: 'home', component: HomePage },
    { path: '/test', name: 'test', component: TestPage },
    { path: '/review', name: 'review', component: ReviewPage }
];

// Create router instance
const router = new SimpleRouter(routes);

// Router View Component
const RouterView = {
    name: 'RouterView',
    data() {
        return {
            currentComponent: router.component,
            updateHandler: null
        };
    },
    created() {
        // Watch for route changes
        this.updateHandler = () => {
            this.currentComponent = router.component;
        };
        
        window.addEventListener('hashchange', this.updateHandler);
    },
    beforeUnmount() {
        if (this.updateHandler) {
            window.removeEventListener('hashchange', this.updateHandler);
        }
    },
    render() {
        return this.currentComponent ? Vue.h(this.currentComponent) : null;
    }
};

// Create Vue app
const app = createApp({
    components: {
        RouterView
    },
    template: '<router-view></router-view>',
    provide() {
        return {
            $router: router,
            $route: router.currentRoute
        };
    },
    mounted() {
        // Initialize IndexedDB
        StorageService.init().catch(error => {
            console.error('Failed to initialize storage:', error);
        });
        
        // Load initial data
        DataService.loadData().catch(error => {
            console.error('Failed to load data:', error);
        });
    }
});

// Register global components
app.component('RouterView', RouterView);
app.component('HomePage', HomePage);
app.component('TestPage', TestPage);
app.component('ReviewPage', ReviewPage);
app.component('LessonSelector', LessonSelector);
app.component('HandwritingCanvas', HandwritingCanvas);

// Inject router into all components
app.mixin({
    computed: {
        $router() {
            return router;
        },
        $route() {
            return router.currentRoute;
        }
    }
});

// Mount app
app.mount('#app');

// Make router globally available for debugging
window.app = app;
window.router = router;

define(['N/cache', 'N/runtime', './mapping'], (Cache, Runtime, Mapping) =>{

    const getCacheName = () => {
        let script = Runtime.getCurrentScript();
        let integrationId = script.getParameter({name: 'custscript_demo_per_import_integration'});
        return script.deploymentId + '_' + integrationId;
    }

    const setIntegration = (integration) => {
        Cache.getCache({
            name: getCacheName(),
            scope: Cache.Scope.PRIVATE
        }).put({key: 'integration', value: integration});
    }

    const setJob = (job) => {
        Cache.getCache({
            name: getCacheName(),
            scope: Cache.Scope.PRIVATE
        }).put({key: 'job', value: job});
    }

    const getIntegration = () => {
        let cache = Cache.getCache({
            name: getCacheName(),
            scope: Cache.Scope.PRIVATE
        });
        return JSON.parse(cache.get({key: 'integration'}));
    }

    const getJob = () => {
        let cache = Cache.getCache({
            name: getCacheName(),
            scope: Cache.Scope.PRIVATE
        });
        return cache.get({key: 'job'});
    }

    const removeIntegration = () => {
        Cache.getCache({
            name: getCacheName(),
            scope: Cache.Scope.PRIVATE
        }).remove({key:'integration'})
    }

    const removeJob = () => {
        Cache.getCache({
            name: getCacheName(),
            scope: Cache.Scope.PRIVATE
        }).remove({key:'job'})
    }

    const getMappings = (_integration) => {
        Mapping.init(_integration.system)
        let mappingsCache = Cache.getCache({
            name: getCacheName() + '_mappings',
            scope: Cache.Scope.PROTECTED,
        });
        return JSON.parse(mappingsCache.get({
            key: getCacheName() + '_mappings',
            loader: Mapping.getMappings,
            ttl: 600
        }));
    }

    return {setIntegration, setJob, getIntegration, getJob, removeIntegration, removeJob, getMappings}
})
define(['N/error',
        'N/record',
        'N/search',
        './list',
        './connect/integration_call',
        './connect/mapping',
        './connect/lib/employee',
        './connect/lib/util',
        './connect/lib/ext/moment.min'
    ], 

    (Error, Record, Search, List, IntegrationCall, Mapping, Employee, Util, moment) => {

        const errorName = 'PERSONIO_CONNECTOR_ERROR';

        let integration = null;
        let obj = null;
        let mappings = null;

        const init = (_obj, _integration, _mappings) => {
            obj = _obj;
            integration = _integration;
            mappings = _mappings;
        }

        const getById = (id) => {
            IntegrationCall.init(integration);
            let call = IntegrationCall.execute({query: 'projects/' + id, save: false})
            return call.data;
        }

        const process = (values) => {
            let integrationData = {
                _demo_per_integration: integration.id,
                _demo_per_id: String(obj.id.value),
                _demo_per_system: integration.system.id,
                _demo_per_external_creation_date: new Date(obj.hire_date.value)
            }
            return Employee.save(transform(values), [], integrationData);
        }

        const getInputData = (parameters) => {

            let minDate = moment(parameters.minDate).format();
            let url = integration.connection.host + '/company/employees?limit=100&updated_since=' + minDate
            return List.get(integration, url, 'Employee');
        }

        const transform = (values) => {
            const getEmployeeId = (id) => {
                let searchObj = Search.create({
                    type: Record.Type.EMPLOYEE,
                    filters: [
                        ['externalid', 'is', id ],

                    ],
                    columns: [
                        'internalid', 'isinactive' , 'releasedate', 'giveaccess', 'subsidiary'
                    ]
                });
                let employeeObj = {}
                searchObj.run().each(function (result) {
                    employeeObj.id = result.id;
                    employeeObj.isinactive = result.getValue('isinactive');
                    employeeObj.releasedate = result.getValue('releasedate');
                    employeeObj.giveaccess = result.getValue('giveaccess');
                    return false;
                });
                return employeeObj
            }

            let subsidiaryIdPer = obj.subcompany.value ? obj.subcompany.value.attributes.id : null 
            if (!subsidiaryIdPer) throw Error.create({name: 'INACTIVE_EMPLOYEE' , message: 'Subsidiary/Subcompany cannot be empty'});
            let subsidiaryId = mappings.subsidiaries[subsidiaryIdPer]
            if (!subsidiaryId) throw Error.create({name: errorName , message: 'Subsidiary not found: id ' + subsidiaryIdPer});

            let employeeSrch = getEmployeeId(obj.id.value + '_' + subsidiaryId);
            let isTerminated = employeeSrch.isinactive ? new Date(employeeSrch.isinactive) < new Date () : false

            if (employeeSrch.id && (employeeSrch.isinactive || isTerminated) && obj.termination_date.value ? new Date(obj.termination_date.value) < new Date () : false) 
                throw Error.create({name: 'INACTIVE_EMPLOYEE' , message: 'Employee is inactive both in Personio and NS: id ' + employeeSrch.id});

            let locationIdPer = obj.cost_centers.value[0] ? obj.cost_centers.value[0].attributes.id : null
            let locationId = null
            if (locationIdPer) {
                locationId = mappings.locations[locationIdPer] 
                if (!locationId) throw Error.create({name: errorName , message: 'Location mapping not found: id ' + locationIdPer});
            }

            let departmentIdPer = obj.dynamic_9827098.value
            let departmentId = null
            if (departmentIdPer) {
                departmentId = mappings.departments[departmentIdPer] 
                if (!departmentId) throw Error.create({name: errorName , message: 'Department mapping not found: id ' + departmentIdPer});
            }

            let empDepartmentIdPer = obj.team.value ? obj.team.value.attributes.id : null   
            let empDepartmentId = null
            if (empDepartmentIdPer) {
                empDepartmentId = mappings.departments[empDepartmentIdPer] 
                if (!empDepartmentId) throw Error.create({name: errorName , message: 'Employee department mapping not found: id ' + empDepartmentIdPer});    
            }

            let classIdPer = obj.dynamic_9827099.value
            let classId = null
            if (classIdPer) {
                classId = mappings.classes[classIdPer] 
                if (!classId) throw Error.create({name: errorName , message: 'Class mapping not found: id ' + classIdPer});
            }

            let firstName = obj.first_name.value.trim()

            if (firstName.length > 32) firstName = firstName.trim().replace('-' , '') > 32 ? firstName.trim().replace('-' , '').substring(0, 32) : firstName.trim().replace('-' , '')

            let employee = {
                type: Record.Type.EMPLOYEE,
                autoname: false,
                subsidiary: subsidiaryId,
                location: locationId,
                firstname: firstName,
                lastname: obj.last_name.value.trim(),
                hiredate: obj.hire_date.value ? new Date(obj.hire_date.value) : null,
                releasedate: obj.termination_date.value ? new Date(obj.termination_date.value) : null,
                custentity_demo_per_id: obj.id.value,
                externalid: obj.id.value,
                entityid: obj.id.value,
                custentity_ffa_email_approval: true,
                department: departmentId,
                custentity_st_employeedepartment: empDepartmentId,
                class: classId,
                isinactive: obj.termination_date.value ? new Date(obj.termination_date.value) < new Date () : false ,

            }

            if (!employeeSrch.giveaccess) employee.email = obj.email.value.trim() //Case employee don't have access -> email can be changed

            let supervisorIdPer = obj.supervisor.value ? obj.supervisor.value.attributes.id.value : null //Case supervisor don't exist -> add the employee anyways
            let supervisorId = null
            if (supervisorIdPer) {
                supervisorSrch = getEmployeeId(supervisorIdPer)

                let isTerminated = supervisorSrch.releasedate ? new Date(supervisorSrch.releasedate) < new Date () : false

                if (supervisorSrch.id && (!supervisorSrch.isinactive || !isTerminated)){
                    employee.supervisor = supervisorId
                } 

            }

            Object.assign(employee, values)
            return employee;
        }

        return {init, getInputData, getById, process}

    })

// IdxPropertySearch Component
// @stratusjs/idx/property/search.component
// <stratus-idx-property-search>
// --------------

// Runtime
import _ from 'lodash'
import {Stratus} from '@stratusjs/runtime/stratus'
import * as angular from 'angular'

// Angular 1 Modules
import 'angular-material'

// Services
import '@stratusjs/idx/idx'

// Stratus Dependencies
import {isJSON} from '@stratusjs/core/misc'
import {cookie} from '@stratusjs/core/environment'
// FIXME should we be renaming the old 'stratus.directives' variables to something else now that we're @stratusjs?
import 'stratus.directives.stringToNumber'
import {WhereOptions} from '@stratusjs/idx/idx'

// Environment
const min = !cookie('env') ? '.min' : ''
const packageName = 'idx'
const moduleName = 'property'
const componentName = 'search'
// There is not a very consistent way of pathing in Stratus at the moment
const localDir = `${Stratus.BaseUrl}${Stratus.DeploymentPath}@stratusjs/${packageName}/src/${moduleName}/`

Stratus.Components.IdxPropertySearch = {
    bindings: {
        elementId: '@',
        tokenUrl: '@',
        listId: '@',
        listLinkUrl: '@',
        listLinkTarget: '@',
        options: '@',
        template: '@',
        variableSync: '@',
        widgetName: '@'
    },
    controller(
        $attrs: angular.IAttributes,
        $q: angular.IQService,
        $mdConstant: any, // mdChips item
        $mdPanel: angular.material.IPanelService,
        $scope: object | any, // angular.IScope breaks references so far
        $timeout: angular.ITimeoutService,
        $window: angular.IWindowService,
        Idx: any,
    ) {
        // Initialize
        const $ctrl = this
        $ctrl.uid = _.uniqueId(_.camelCase(packageName) + '_' + _.camelCase(moduleName) + '_' + _.camelCase(componentName) + '_')
        Stratus.Instances[$ctrl.uid] = $scope
        $scope.elementId = $attrs.elementId || $ctrl.uid
        if ($attrs.tokenUrl) {
            Idx.setTokenURL($attrs.tokenUrl)
        }
        Stratus.Internals.CssLoader(`${localDir}${$attrs.template || componentName}.component${min}.css`)

        $scope.$mdConstant = $mdConstant

        /**
         * All actions that happen first when the component loads
         * Needs to be placed in a function, as the functions below need to the initialized first
         */
        $ctrl.$onInit = async () => {
            $scope.widgetName = $attrs.widgetName || ''
            $scope.listId = $attrs.listId || null
            $scope.listInitialized = false
            $scope.listLinkUrl = $attrs.listLinkUrl || '/property/list'
            $scope.listLinkTarget = $attrs.listLinkTarget || '_self'

            // If the List hasn't updated this widget after 1 second, make sure it's checked again. A workaround for
            // the race condition for now, up for suggestions
            $timeout(async () => {
                if (!$scope.listInitialized) {
                    await $scope.refreshSearchWidgetOptions()
                }
                // Sync needs to happen here so that the List and still connect with the Search widget
                await $scope.variableSync()
            }, 1000)

            $scope.options = $attrs.options && isJSON($attrs.options) ? JSON.parse($attrs.options) : {}

            $scope.filterMenu = null
            $scope.options.service = $scope.options.service || []
            $scope.options.forRent = false

            // Set default queries
            $scope.options.query = $scope.options.query || {}
            $scope.setQuery($scope.options.query)

            // Set default selections TODO may need some more universally set options to be able to use
            $scope.options.selection = $scope.options.selection || {}
            $scope.options.selection.Bedrooms = $scope.options.selection.Bedrooms || [
                {name: '1+', value: 1},
                {name: '2+', value: 2},
                {name: '3+', value: 3},
                {name: '4+', value: 4},
                {name: '5+', value: 5}
            ]
            $scope.options.selection.Bathrooms = $scope.options.selection.Bathrooms || [
                {name: '1+', value: 1},
                {name: '2+', value: 2},
                {name: '3+', value: 3},
                {name: '4+', value: 4},
                {name: '5+', value: 5}
            ]
            $scope.options.selection.Order = $scope.options.selection.Order || [
                {name: 'Price (high to low)', value: '-ListPrice'},
                {name: 'Price (low to high)', value: 'ListPrice'}
            ]
            $scope.options.selection.Status = $scope.options.selection.Status || {}
            $scope.options.selection.Status.default = $scope.options.selection.Status.default || {
                Sale: ['Active', 'Contract'],
                Lease: ['Active']
            }
            $scope.options.selection.ListingType = $scope.options.selection.ListingType || {}
            // These determine what ListingTypes options that should currently be 'shown' based on selections.
            // Automatically updated with a watcher
            $scope.options.selection.ListingType.group = $scope.options.selection.ListingType.group || {
                Residential: true,
                Commercial: false
            }
            // TODO These values need to be supplied by the MLS' to ensure we dont show ones that don't exist
            $scope.options.selection.ListingType.list = $scope.options.selection.ListingType.list || {
                Residential: ['House', 'Condo', 'Townhouse', 'MultiFamily', 'Manufactured', 'Land', 'LeaseHouse', 'LeaseCondo', 'LeaseTownhouse', 'LeaseOther'],
                Commercial: ['Commercial', 'CommercialBusinessOp', 'CommercialResidential', 'CommercialLand', 'LeaseCommercial'],
                Lease: ['LeaseHouse', 'LeaseCondo', 'LeaseTownhouse', 'LeaseOther', 'LeaseCommercial']
            }
            // These are the default selections and should be updated by the page on load(if needed)
            $scope.options.selection.ListingType.default = $scope.options.selection.ListingType.default || {
                Sale: {
                    Residential: ['House', 'Condo', 'Townhouse'],
                    Commercial: ['Commercial', 'CommercialBusinessOp']
                },
                Lease: {
                    Residential: ['LeaseHouse', 'LeaseCondo', 'LeaseTownhouse'],
                    Commercial: ['LeaseCommercial']
                }
            }
            // These are static and never change. merely map correct values
            $scope.options.selection.ListingType.All = $scope.options.selection.ListingType.All || [
                {name: 'House', value: 'House', group: 'Residential', lease: false},
                {name: 'Condo', value: 'Condo', group: 'Residential', lease: false},
                {name: 'Townhouse', value: 'Townhouse', group: 'Residential', lease: false},
                {name: 'Multi-Family', value: 'MultiFamily', group: 'Residential', lease: false},
                {name: 'Manufactured', value: 'Manufactured', group: 'Residential', lease: false},
                {name: 'Land', value: 'Land', group: 'Residential', lease: false},
                {name: 'Other', value: 'Other', group: 'Residential', lease: false},
                {name: 'Commercial', value: 'Commercial', group: 'Commercial', lease: false},
                {name: 'Commercial Business Op', value: 'CommercialBusinessOp', group: 'Commercial', lease: false},
                {name: 'Commercial Residential', value: 'CommercialResidential', group: 'Commercial', lease: false},
                {name: 'Commercial Land', value: 'CommercialLand', group: 'Commercial', lease: false},
                {name: 'House', value: 'LeaseHouse', group: 'Residential', lease: true},
                {name: 'Condo', value: 'LeaseCondo', group: 'Residential', lease: true},
                {name: 'Townhouse', value: 'LeaseTownhouse', group: 'Residential', lease: true},
                {name: 'Other', value: 'LeaseOther', group: 'Residential', lease: true},
                {name: 'Commercial', value: 'LeaseCommercial', group: 'Commercial', lease: true}
            ]

            $scope.setQueryDefaults()

            // Register this Search with the Property service
            Idx.registerSearchInstance($scope.elementId, $scope, $scope.listId)

            // await $scope.variableSync() sync is moved to teh timeout above so it can still work with List widgets
        }

        $scope.$watch('options.query.ListingType', () => {
            // TODO: Consider Better solution? I just added the check to see if $scope.options.query is set
            // because there are cases where $scope.options.query is not defined (null). This happens on admin
            // edit page load  for a new record where nothing has been set on a page yet.
            // Davis: removed check for $scope.options.query.ListingType as if it's not an Array will create it
            if ($scope.options.query && $scope.options.selection.ListingType.list) {
                if (!Object.prototype.hasOwnProperty.call($scope.options.query, 'ListingType')) {
                    $scope.options.query.ListingType = []
                }
                if (!_.isArray($scope.options.query.ListingType)) {
                    $scope.options.query.ListingType = [$scope.options.query.ListingType]
                }
                $scope.options.selection.ListingType.group.Residential =
                    $scope.arrayIntersect($scope.options.selection.ListingType.list.Residential, $scope.options.query.ListingType)
                $scope.options.selection.ListingType.group.Commercial =
                    $scope.arrayIntersect($scope.options.selection.ListingType.list.Commercial, $scope.options.query.ListingType)

                $scope.options.forRent =
                    $scope.arrayIntersect($scope.options.selection.ListingType.list.Lease, $scope.options.query.ListingType)
                // console.log('watched ListingType', $scope.options.query.ListingType, $scope.options.selection.ListingType.group)
            }
        })

        /**
         * Create filter function for a query string
         */
        const createFilterFor = (query: string) => {
            const lowercaseQuery = query.toLowerCase()

            return (hay: any) => {
                return (hay.value.indexOf(lowercaseQuery) === 0)
            }

        }

        /**
         * Update a scope nest variable from a given string path.
         * Works with updateNestedPathValue
         */
        $scope.updateScopeValuePath = async (scopeVarPath: string, value: any): Promise<string | any> => {
            if (
                value == null ||
                value === 'null' ||
                value === ''
            ) {
                return false
            }
            // console.log('Update updateScopeValuePath', scopeVarPath, 'to', value, typeof value)
            const scopePieces = scopeVarPath.split('.')
            return $scope.updateNestedPathValue($scope, scopePieces, value)
        }

        /**
         * Nests further into a string path to update a value
         * Works from updateScopeValuePath
         */
        $scope.updateNestedPathValue = async (currentNest: object | any, pathPieces: object | any, value: any): Promise<string | any> => {
            const currentPiece = pathPieces.shift()
            if (
                currentPiece &&
                Object.prototype.hasOwnProperty.call(currentNest, currentPiece)
            ) {
                // console.log('checking piece', currentPiece, 'in', currentNest)
                if (pathPieces[0]) {
                    return $scope.updateNestedPathValue(currentNest[currentPiece], pathPieces, value)
                } else {
                    if (_.isArray(currentNest[currentPiece]) && !_.isArray(value)) {
                        value = value === '' ? [] : value.split(',')
                    }
                    // console.log(currentPiece, 'updated to ', value)
                    // FIXME need to checks the typeof currentNest[currentPiece] and convert value to that type.
                    // This is mostly just to allow a whole object to be passed in and saved
                    if (_.isObject(currentNest[currentPiece])) {
                        currentNest[currentPiece] = JSON.parse(value)
                    } else {
                        currentNest[currentPiece] = value
                    }
                    return value
                }
            } else {
                console.warn('updateNestedPathValue couldn\'t find', currentPiece, 'in', currentNest, 'It may need to be initialized first')
                return null
            }
        }

        /**
         * Get the Input element of a specified ID
         */
        $scope.getInput = (elementId: string): any => angular.element(document.getElementById(elementId))

        /**
         * Sync Gutensite form variables to a Stratus scope
         * TODO move this to it's own directive/service
         */
        $scope.variableSync = async (): Promise<void> => {
            $scope.variableSyncing = $attrs.variableSync && isJSON($attrs.variableSync) ? JSON.parse($attrs.variableSync) : {}
            // console.log('variables syncing: ', $scope.variableSyncing)
            const promises: any[] = []
            Object.keys($scope.variableSyncing).forEach((elementId: string) => {
                promises.push(
                    $q(async (resolve: void | any) => {
                        const varElement = $scope.getInput(elementId)
                        if (varElement) {
                            // console.log('got input', varElement, _.clone(varElement.val()))
                            // Form Input exists
                            const scopeVarPath = $scope.variableSyncing[elementId]
                            // convert into a real var path and set the initial value from the exiting form value
                            await $scope.updateScopeValuePath(scopeVarPath, varElement.val())

                            // Creating watcher to update the input when the scope changes
                            $scope.$watch(
                                scopeVarPath,
                                (value: any) => {
                                    // console.log('detecting', scopeVarPath, 'as', value)
                                    if (
                                        _.isString(value) ||
                                        _.isNumber(value) ||
                                        value == null
                                    ) {
                                        // console.log('updating', scopeVarPath, 'value to', value, 'was', varElement.val())
                                        varElement.val(value)
                                    } else {
                                        // console.log('updating json', scopeVarPath, 'value to', value, 'was', varElement.val())
                                        varElement.val(JSON.stringify(value))
                                    }
                                    // varElement.fireEvent('onchange') // deprecated and no longer works
                                    varElement[0].dispatchEvent(new Event('change'))
                                },
                                true
                            )
                        }
                        resolve()
                    })
                )
            })
            await $q.all(promises)
        }

        /**
         * If element exists in Array shortcut helper
         */
        $scope.inArray = (item: any, array: any[]): boolean => {
            if (!_.isArray(array)) {
                // console.warn('Array undefined, cannot search for', item)
                return false
            }
            return (array.indexOf(item) !== -1)
        }

        $scope.arrayIntersect = (itemArray: any[], array: any[]): boolean => {
            if (
                !_.isArray(array) ||
                !_.isArray(itemArray)
            ) {
                console.warn('Array undefined, cannot search for', itemArray, 'in', array)
                // return []
                return false
            }
            return itemArray.filter(value => array.indexOf(value) !== -1).length > 0
        }

        /**
         * Add or remove a certain element from an array
         */
        $scope.toggleArrayElement = (item: any, array: any[]): void => {
            array = array || []
            const arrayIndex = array.indexOf(item)
            if (arrayIndex >= 0) {
                array.splice(arrayIndex, 1)
            } else {
                array.push(item)
            }
        }

        /**
         * Add a popup on screen using an existing element
         * TODO could use more options
         * @param ev - Click Event
         * @param menuElement id or class of element to grab
         */
        $scope.showInlinePopup = (ev: any, menuElement: string): void => {
            if (!$scope.filterMenu) {
                const position: angular.material.IPanelPosition | any = $mdPanel.newPanelPosition()
                    .relativeTo(ev.srcElement)
                    .addPanelPosition($mdPanel.xPosition.CENTER, $mdPanel.yPosition.BELOW)

                const animation = $mdPanel.newPanelAnimation()
                animation.openFrom(position)
                animation.closeTo(position)
                animation.withAnimation($mdPanel.animation.FADE)

                const config: angular.material.IPanelConfig & {
                    contentElement: string,
                    openFrom: any
                } = {
                    animation,
                    attachTo: angular.element(document.body),
                    contentElement: menuElement,
                    position,
                    openFrom: ev,
                    clickOutsideToClose: true,
                    escapeToClose: true,
                    focusOnOpen: false,
                    zIndex: 2
                }

                $scope.filterMenu = $mdPanel.create(config)

                $scope.filterMenu.reposition = function reposition() {
                    $timeout(() => {
                        $scope.filterMenu.updatePosition(position)
                    }, 100)
                }
            }

            $scope.filterMenu.open()
        }

        /**
         * Update the entirety options.query in a safe manner to ensure undefined references are not produced
         */
        $scope.setQuery = (newQuery?: WhereOptions): void => {
            newQuery = newQuery || {}
            // getDefaultWhereOptions returns the set a required WhereOptions with initialized arrays
            $scope.options.query = _.extend(Idx.getDefaultWhereOptions(), newQuery)
        }

        $scope.setQueryDefaults = (): void => {
            $scope.$applyAsync(() => {
                if ($scope.options.query.ListingType.length < 1) {
                    $scope.options.query.ListingType = $scope.options.selection.ListingType.default.Sale.Residential
                    // console.log('updating', $scope.options.query.ListingType)
                    $scope.selectDefaultListingType()
                }
            })
        }

        $scope.selectDefaultListingType = (listingGroup?: string): void => {
            if (!listingGroup) {
                listingGroup = 'Commercial'
                if (!$scope.options.selection.ListingType.group.Commercial) {
                    listingGroup = 'Residential'
                }
            }
            $scope.options.query.ListingType = $scope.options.forRent ?
                $scope.options.selection.ListingType.default.Lease[listingGroup] :
                $scope.options.selection.ListingType.default.Sale[listingGroup]
            if ($scope.filterMenu) {
                $scope.filterMenu.reposition()
            }
            if ($scope.options.forRent) {
                $scope.options.query.Status = $scope.options.selection.Status.default.Lease
            } else {
                $scope.options.query.Status = ($scope.options.query.Status && $scope.options.query.Status.length > 0) ?
                    $scope.options.query.Status : $scope.options.selection.Status.default.Lease
            }
        }

        /**
         * Call a List widget to perform a search
         * TODO await until search is complete?
         */
        $scope.searchProperties = (): void => {
            let listScope
            if ($scope.listId) {
                listScope = Idx.getListInstance($scope.listId)
            }
            if (listScope) {
                $scope.options.query.Page = 1
                listScope.searchProperties($scope.options.query, true)
            } else {
                Idx.setUrlOptions('Search', $scope.options.query)
                $window.open($scope.listLinkUrl + '#!/' + Idx.getUrlOptionsPath(), $scope.listLinkTarget)
            }
        }

        /**
         * Have the widget options refreshed form the Widget's end
         */
        $scope.refreshSearchWidgetOptions = async (): Promise<void> => {
            if ($scope.listId) {
                const instance = Idx.getListInstance($scope.listId)
                if (instance && instance.hasOwnProperty('refreshSearchWidgetOptions')) {
                    await instance.refreshSearchWidgetOptions()
                }
            }
        }
    },
    templateUrl: ($attrs: angular.IAttributes): string => `${localDir}${$attrs.template || componentName}.component${min}.html`
}

// Angular Core
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnInit, Output} from '@angular/core'
import {FormControl} from '@angular/forms'

// CDK
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop'

// External
import {Observable, Subject, Subscriber} from 'rxjs'
import {map, startWith} from 'rxjs/operators'

// SVG Icons
import {DomSanitizer, ɵDomSanitizerImpl} from '@angular/platform-browser'
import {MatIconRegistry} from '@angular/material/icon'

// RXJS
import {SubjectSubscriber} from 'rxjs/internal/Subject'

// External Dependencies
import {Stratus} from '@stratusjs/runtime/stratus'
import _ from 'lodash'

// Services
import {Registry} from '@stratusjs/angularjs/services/registry'
import {cookie} from '@stratusjs/core/environment'
import { EventManager } from '@stratusjs/core/events/eventManager'
import {Collection} from '@stratusjs/angularjs/services/collection'
import {Model} from '@stratusjs/angularjs/services/model'

const localDir = `/assets/1/0/bundles/${boot.configuration.paths['@stratusjs/angular/*'].replace(/[^/]*$/, '')}`
const systemDir = '@stratusjs/angular'
const moduleName = 'selector'

const has = (object: object, path: string) => _.has(object, path) && !_.isEmpty(_.get(object, path))

// export interface Model {
//     completed: boolean;
//     data: object;
// }

/**
 * @title AutoComplete Selector with Drag&Drop Sorting
 */
@Component({
    // selector: 'sa-selector-component',
    selector: 'sa-selector',
    templateUrl: `${localDir}/${moduleName}/${moduleName}.component.html`,
    // FIXME: This doesn't work, as it seems Angular attempts to use a System.js import instead of their own, so it will
    // require the steal-css module
    // styleUrls: [
    //     `${localDir}/${moduleName}/${moduleName}.component.css`
    // ],
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class SelectorComponent { // implements OnInit, OnChanges

    // Basic Component Settings
    title = 'selector-dnd'
    uid: string

    // Registry Attributes
    @Input() target: string
    @Input() targetSuffix: string
    @Input() id: number
    @Input() manifest: boolean
    @Input() decouple: boolean
    @Input() direct: boolean
    @Input() api: object
    @Input() urlRoot: object

    // Component Attributes
    // @Input() foo: object

    // Dependencies
    _ = _
    has = has
    log = console.log
    sanitizer: DomSanitizer
    selectCtrl = new FormControl()

    // Stratus Data Connectivity
    registry = new Registry()
    fetched: Promise<boolean|Collection|Model>
    data: any
    collection: any
    // @Output() model: any;
    model: any

    // Observable Connection
    dataSub: Observable<[]>
    onChange = new Subject()
    subscriber: Subscriber<any>
    // Note: It may be better to LifeCycle::tick(), but this works for now

    // API Connectivity for Selector
    // filteredModels: Observable<[]>;
    // filteredModels: any;

    constructor(
        iconRegistry: MatIconRegistry,
        sanitizer: DomSanitizer,
        private ref: ChangeDetectorRef,
        private elementRef: ElementRef
    ) {

        // Initialization
        this.uid = _.uniqueId('sa_selector_component_')
        Stratus.Instances[this.uid] = this

        // Dependencies
        this.sanitizer = sanitizer

        // SVG Icons
        iconRegistry.addSvgIcon(
            'delete',
            sanitizer.bypassSecurityTrustResourceUrl('/Api/Resource?path=@SitetheoryCoreBundle:images/icons/actionButtons/delete.svg')
        )

        // TODO: Assess & Possibly Remove when the System.js ecosystem is complete
        // Load Component CSS until System.js can import CSS properly.
        Stratus.Internals.CssLoader(`${localDir}/${moduleName}/${moduleName}.component.css`)

        // Data Connections
        this.fetchData()
            .then(data => {
                if (!data || !(data instanceof EventManager)) {
                    console.warn('Unable to bind data from Registry!')
                    return
                }
                // Manually render upon model change
                // this.ref.detach();
                const onDataChange = () => {
                    if (!data.completed) {
                        return
                    }
                    // this.onDataChange(ref);
                    this.dataDefer(this.subscriber)
                    this.ref.detectChanges()
                }
                data.on('change', onDataChange)
                onDataChange()
            })

        // Declare Observable with Subscriber (Only Happens Once)
        this.dataSub = new Observable(subscriber => this.dataDefer(subscriber))

        // AutoComplete Binding
        // this.filteredModels = this.selectCtrl.valueChanges
        //     .pipe(
        //         startWith(''),
        //         map(value => this._filterModels(value))
        //     );

        // console.info('constructor!');
    }

    // ngOnInit() {
    //     console.info('selector.ngOnInit')
    // }

    // ngOnChanges() {
    //     // Display Inputs
    //     if (!cookie('env')) {
    //         return
    //     }
    //     console.log('inputs:', {
    //         target: this.target,
    //         targetSuffix: this.targetSuffix,
    //         id: this.id,
    //         manifest: this.manifest,
    //         decouple: this.decouple,
    //         direct: this.direct,
    //         api: this.api,
    //         urlRoot: this.urlRoot,
    //     })
    // }

    // ngDoCheck(): void {
    //     console.info('ngDoCheck:', this.dataSub);
    // }

    drop(event: CdkDragDrop<string[]>) {
        const models = this.dataRef()
        if (!models || !models.length) {
            return
        }
        moveItemInArray(models, event.previousIndex, event.currentIndex)
        let priority = 0
        _.forEach(models, (model) => model.priority = priority++)
        this.model.trigger('change')
    }

    remove(model: any) {
        const models = this.dataRef()
        if (!models || !models.length) {
            return
        }
        const index: number = models.indexOf(model)
        if (index === -1) {
            return
        }
        models.splice(index, 1)
        // this.prioritize();
        this.model.trigger('change')
    }

    // Data Connections
    fetchData() {
        if (this.fetched) {
            return this.fetched
        }
        return this.fetched = this.registry.fetch(
            Stratus.Select(this.elementRef.nativeElement),
            this
        )
        // return this.fetched = this.registry.fetch({
        //     target: this.target,
        //     targetSuffix: this.targetSuffix,
        //     id: this.id,
        //     manifest: this.manifest,
        //     decouple: this.decouple,
        //     direct: this.direct,
        //     api: this.api,
        //     urlRoot: this.urlRoot,
        // }, this)
    }

    // Ensures Data is populated before hitting the Subscriber
    dataDefer(subscriber: Subscriber<any>) {
        this.subscriber = subscriber
        const models = this.dataRef()
        if (!models || !models.length) {
            setTimeout(() => {
                this.dataDefer(subscriber)
            }, 500)
            return
        }
        // console.log('pushed models to subscriber.')
        subscriber.next(models)
        // TODO: Add a returned Promise to ensure async/await can use this defer directly.
    }

    dataRef(): any {
        if (!this.model) {
            return []
        }
        const models = _.get(this.model, 'data.version.modules')
        if (!models || !_.isArray(models)) {
            return []
        }
        return models
    }

    // selectedModel (observer: any) : any {
    //     if (!this.data) {
    //         this.fetchData().then(function (data: any) {
    //             observer.next(data)
    //         });
    //     }
    //     // data.on('change', () => observer.next(that.dataRef()));
    //     observer.next()
    // }

    // async selectedModelFetch(observer: any): Promise<[]> {
    //     const that = this;
    //     return new Promise(function (resolve, reject) {
    //         if (that.model) {
    //             resolve(that.dataRef());
    //             return;
    //         }
    //         that.fetchData()
    //             .then(function (data: any) {
    //                 if (!data.completed) {
    //                     console.error('still waiting on XHR!');
    //                     // return;
    //                 }
    //                 resolve(that.dataRef());
    //             })
    //             .catch(function (err: any) {
    //                 console.error("unable to fetch model:", err);
    //                 reject(err)
    //             });
    //     });
    // }

    // private _filterModels(value: string): any {
    //     // return await this.collection.filterAsync(value);
    //     // return await [];
    //     return [];
    // }

    onDataChange(ref: ChangeDetectorRef) {
        // that.prioritize();
        this.dataDefer(this.subscriber)
        ref.detectChanges()
    }

    prioritize() {
        const models = this.dataRef()
        if (!models || !models.length) {
            return
        }
        let priority = 0
        _.forEach(models, (model) => model.priority = priority++)
    }

    // findImage(model: any): string {
    //     const mime = _.get(model, 'version.images[0].mime');
    //     if (mime === undefined) {
    //         return '';
    //     }
    //     if (mime.indexOf('image') !== -1) {
    //         return _.get(model, 'version.images[0].src') || _.get(model, 'version.shellImages[0].src') || '';
    //     } else if (mime.indexOf('video') !== -1) {
    //         return _.get(model, 'version.images[0].meta.thumbnail_small') || '';
    //     }
    //     return '';
    // }
}

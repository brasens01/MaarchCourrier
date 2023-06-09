import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { HeaderService } from '@service/header.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AppService } from '@service/app.service';
import { SortPipe } from '../../../plugins/sorting.pipe';
import { FormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { debounceTime, filter, distinctUntilChanged, tap, switchMap, exhaustMap, catchError } from 'rxjs/operators';
import { LatinisePipe } from 'ngx-pipes';
import { FunctionsService } from '@service/functions.service';

@Component({
    selector: 'app-folder-input',
    templateUrl: 'folder-input.component.html',
    styleUrls: [
        'folder-input.component.scss',
        '../../indexation/indexing-form/indexing-form.component.scss'
    ],
    providers: [SortPipe]
})

export class FolderInputComponent implements OnInit {


    loading: boolean = false;

    key: string = 'idToDisplay';

    canAdd: boolean = true;

    listInfo: string;
    myControl = new FormControl();
    filteredOptions: Observable<string[]>;
    options: any;
    valuesToDisplay: any = {};
    dialogRef: MatDialogRef<any>;
    newIds: number[] = [];


    tmpObject: any = null;

    /**
     * FormControl used when autocomplete is used in form and must be catched in a form control.
     */
    @Input('control') controlAutocomplete: FormControl;

    @Input() returnValue: 'id' | 'object' = 'id';

    @ViewChild('autoCompleteInput', { static: true }) autoCompleteInput: ElementRef;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notify: NotificationService,
        public dialog: MatDialog,
        private headerService: HeaderService,
        public appService: AppService,
        private latinisePipe: LatinisePipe,
        private functionsService: FunctionsService
    ) {

    }

    ngOnInit() {
        this.controlAutocomplete.valueChanges
            .pipe(
                tap((data: any) => {
                    if (this.returnValue === 'object') {
                        this.valuesToDisplay = {};
                        data.forEach((item: any) => {
                            this.valuesToDisplay[item.id] = item.label;
                        });
                    } else {
                        if (!this.functionsService.empty(this.tmpObject)) {
                            this.valuesToDisplay[this.tmpObject['id']] = this.tmpObject[this.key];
                            this.tmpObject = null;
                        } else {
                            this.initFormValue();
                        }

                    }
                })
            ).subscribe();
        this.controlAutocomplete.setValue(this.controlAutocomplete.value === null || this.controlAutocomplete.value === '' ? [] : this.controlAutocomplete.value);
        this.initAutocompleteRoute();
    }

    initAutocompleteRoute() {
        this.listInfo = this.translate.instant('lang.autocompleteInfo');
        this.options = [];
        this.myControl.valueChanges
            .pipe(
                debounceTime(300),
                filter(value => value.length > 2),
                distinctUntilChanged(),
                tap(() => this.loading = true),
                switchMap((data: any) => this.getDatas(data)),
                tap((data: any) => {
                    if (data.length === 0) {
                        this.listInfo = this.translate.instant('lang.noAvailableValue');
                    } else {
                        this.listInfo = '';
                    }
                    this.options = data;
                    this.filteredOptions = of(this.options);
                    this.loading = false;
                })
            ).subscribe();
    }

    getDatas(data: string) {
        return this.http.get('../rest/autocomplete/folders', { params: { 'search': data } });
    }

    selectOpt(ev: any) {
        this.setFormValue(ev.option.value);
        this.myControl.setValue('');

    }

    initFormValue() {
        this.controlAutocomplete.value.forEach((ids: any) => {
            this.http.get('../rest/folders/' + ids).pipe(
                tap((data) => {
                    for (const key in data) {
                        this.valuesToDisplay[data[key].id] = data[key].label;
                    }
                })
            ).subscribe();
        });
    }

    setFormValue(item: any) {
        const isSelected = this.returnValue === 'id' ? this.controlAutocomplete.value.indexOf(item['id']) > -1 : this.controlAutocomplete.value.map((val: any) => val.id).indexOf(item['id']) > -1;
        if (!isSelected) {
            let arrvalue = [];
            if (this.controlAutocomplete.value !== null) {
                arrvalue = this.controlAutocomplete.value;
            }
            if (this.returnValue === 'id') {
                arrvalue.push(item['id']);
            } else {
                arrvalue.push({
                    id: item['id'],
                    label: item['idToDisplay']
                });
            }
            this.controlAutocomplete.setValue(arrvalue);
        }
    }

    resetAutocomplete() {
        this.options = [];
        this.listInfo = this.translate.instant('lang.autocompleteInfo');
    }

    private _filter(value: string): string[] {
        if (typeof value === 'string') {
            const filterValue = this.latinisePipe.transform(value.toLowerCase());
            return this.options.filter((option: any) => this.latinisePipe.transform(option[this.key].toLowerCase()).includes(filterValue));
        } else {
            return this.options;
        }
    }

    unsetValue() {
        this.controlAutocomplete.setValue('');
        this.myControl.setValue('');
        this.myControl.enable();
    }

    removeItem(index: number) {

        if (this.newIds.indexOf(this.controlAutocomplete.value[index]) === -1) {
            const arrValue = this.controlAutocomplete.value;
            this.controlAutocomplete.value.splice(index, 1);
            this.controlAutocomplete.setValue(arrValue);
        } else {
            this.http.delete('../rest/folders/' + this.controlAutocomplete.value[index]).pipe(
                tap((data: any) => {
                    const arrValue = this.controlAutocomplete.value;
                    this.controlAutocomplete.value.splice(index, 1);
                    this.controlAutocomplete.setValue(arrValue);
                }),
                catchError((err: any) => {
                    this.notify.handleErrors(err);
                    return of(false);
                })
            ).subscribe();
        }
    }

    addItem() {
        const newElem = {};

        newElem[this.key] = this.myControl.value;

        this.http.post('../rest/folders', { label: newElem[this.key] }).pipe(
            tap((data: any) => {
                for (const key in data) {
                    newElem['id'] = data[key];
                    this.newIds.push(data[key]);
                }
                this.setFormValue(newElem);
                this.myControl.setValue('');
            }),
            catchError((err: any) => {
                this.notify.handleErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    getFolderLabel(data: any) {
        return this.returnValue === 'id' ? this.valuesToDisplay[data] : this.valuesToDisplay[data.id];
    }
}

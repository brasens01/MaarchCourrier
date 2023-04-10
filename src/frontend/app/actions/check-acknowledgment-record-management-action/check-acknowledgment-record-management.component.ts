import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NoteEditorComponent } from '@appRoot/notes/note-editor.component';
import { TranslateService } from '@ngx-translate/core';
import { FunctionsService } from '@service/functions.service';
import { NotificationService } from '@service/notification/notification.service';
import { SessionStorageService } from '@service/session-storage.service';
import { of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

@Component({
    selector: 'app-check-acknowledgment-record-management',
    templateUrl: './check-acknowledgment-record-management.component.html',
    styleUrls: ['./check-acknowledgment-record-management.component.scss']
})
export class CheckAcknowledgmentRecordManagementComponent implements OnInit {

    loading: boolean = false;
    checking: boolean = true;
    resourcesErrors: any[] = [];
    selectedRes: number[] = [];

    canGoToNextRes: boolean = false;
    showToggle: boolean = false;
    inLocalStorage: boolean = false;

    @ViewChild('noteEditor', { static: false }) noteEditor: NoteEditorComponent;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public dialogRef: MatDialogRef<CheckAcknowledgmentRecordManagementComponent>,
        public functions: FunctionsService,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private notify: NotificationService,
        private router: Router,
        private sessionStorage: SessionStorageService
    ) { }

    ngOnInit(): void {
        this.showToggle = this.data.additionalInfo.showToggle;
        this.canGoToNextRes = this.data.additionalInfo.canGoToNextRes;
        this.inLocalStorage = this.data.additionalInfo.inLocalStorage;
        this.checkAcknowledgement();
    }

    checkAcknowledgement() {
        this.http.post(`../rest/resourcesList/users/${this.data.userId}/groups/${this.data.groupId}/baskets/${this.data.basketId}/checkAcknowledgementRecordManagement`, { resources: this.data.resIds }).pipe(
            tap((data: any) => {
                this.resourcesErrors = data.resourcesInformations.errors;
                this.selectedRes = data.resourcesInformations.success;
            }),
            finalize(() => this.checking = false),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    onSubmit() {
        this.loading = true;
        this.sessionStorage.checkSessionStorage(this.inLocalStorage, this.canGoToNextRes, this.data);
        this.executeAction();
    }

    executeAction() {
        this.http.put(this.data.processActionRoute, { resources: this.selectedRes, note: this.noteEditor.getNote() }).pipe(
            tap((data: any) => {
                if (!data) {
                    this.dialogRef.close(this.selectedRes);
                }
                if (data && data.errors != null) {
                    this.notify.error(data.errors);
                }
            }),
            finalize(() => this.loading = false),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }
}

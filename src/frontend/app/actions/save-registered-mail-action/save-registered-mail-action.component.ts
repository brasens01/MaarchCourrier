import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { NoteEditorComponent } from '../../notes/note-editor.component';
import { tap, exhaustMap, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { FunctionsService } from '@service/functions.service';
import { Router } from '@angular/router';

@Component({
    templateUrl: 'save-registered-mail-action.component.html',
    styleUrls: ['save-registered-mail-action.component.scss'],
})
export class SaveRegisteredMailActionComponent implements OnInit {

    loading: boolean = false;

    @ViewChild('noteEditor', { static: true }) noteEditor: NoteEditorComponent;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public dialogRef: MatDialogRef<SaveRegisteredMailActionComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private notify: NotificationService,
        private functionsService: FunctionsService,
        private router: Router,
    ) { }

    ngOnInit(): void { }

    onSubmit() {
        this.loading = true;
        if (this.data.resIds.length === 0) {
            this.indexDocumentAndExecuteAction();
        } else {
            this.executeAction();
        }
    }

    indexDocumentAndExecuteAction() {
        this.http.post('../rest/resources', this.data.resource).pipe(
            tap((data: any) => {
                this.data.resIds = [data.resId];
            }),
            exhaustMap(() => this.http.put(this.data.indexActionRoute, {
                resource: this.data.resIds[0], note: this.noteEditor.getNote(),
                data: {
                    type: this.data.resource.registeredMail_type,
                    warranty: this.data.resource.registeredMail_warranty,
                    issuingSiteId: this.data.resource.registeredMail_issuingSite,
                    letter: this.data.resource.registeredMail_letter,
                    recipient: this.data.resource.registeredMail_recipient,
                    reference: this.data.resource.registeredMail_reference,
                    generated: false
                }
            })
            ),
            tap(() => {
                this.dialogRef.close(this.data.resIds);
            }),
            finalize(() => this.loading = false),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                this.dialogRef.close();
                return of(false);
            })
        ).subscribe();
    }


    executeAction() {
        this.http.put(this.data.processActionRoute, { resources: this.data.resIds, note: this.noteEditor.getNote() }).pipe(
            tap(() => {
                this.dialogRef.close(this.data.resIds);
            }),
            finalize(() => this.loading = false),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }
}

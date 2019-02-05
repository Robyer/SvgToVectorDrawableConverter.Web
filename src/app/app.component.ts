import { Component } from '@angular/core';
import { parse } from 'query-string';
import * as FileSaver from 'file-saver';
import * as JSZip from 'jszip';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor () {
    // tslint:disable-next-line:max-line-length
    window['ClarityIcons'].add({ 'github-icon': '<svg viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path></svg>' });

    this.actionSaveFile();
  }

  private async actionSaveFile () {
    const parsed = parse(location.search);
    const file = parsed['action-save-file'];
    if (file) {
      const zip = await JSZip.loadAsync(file as string, { base64: true });
      const fileName = Object.keys(zip.files)[0];
      const fileContent = await zip.files[fileName].async('text');
      FileSaver.saveAs(new Blob([fileContent], { type: 'image/svg+xml' }), fileName);
      history.back();
    }
  }
}

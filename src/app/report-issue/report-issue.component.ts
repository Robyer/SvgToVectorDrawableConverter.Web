import { Component, OnInit } from '@angular/core';
import { ReportIssueService } from './report-issue.service';
import { ReportIssueRequest } from './ReportIssueRequest';
import { StatsService } from '../services/stats.service';
import { UAParser } from 'ua-parser-js';
import { SettingsService } from '../services/settings.service';
import { targetText } from '../main/TargetLib';

@Component({
  selector: 'app-report-issue',
  templateUrl: './report-issue.component.html',
  styleUrls: ['./report-issue.component.css']
})
export class ReportIssueComponent implements OnInit {
  modalOpen = false;
  svgName: string;
  svgContent: string;
  target: string;
  fixFillType: string;
  userAgent = ReportIssueComponent.getUserAgent();
  browserLanguage = navigator.language;
  additionalInformation: string;

  readonly reportIssueViewModels = new Array<ReportIssueViewModel>();

  private static getUserAgent () {
    const result = new UAParser().getResult();
    return `${result.browser.name} ${result.browser.version} on ${result.os.name} ${result.os.version}`.trim();
  }

  constructor (
    private readonly _reportIssueService: ReportIssueService,
    private readonly _stats: StatsService,
    private readonly _settings: SettingsService
  ) {
    _reportIssueService.open().subscribe(x => {
      this.svgName = x.svgName;
      this.svgContent = x.svgContent;
      this.target = targetText(_settings.libId);
      this.fixFillType = _settings.fixFillType ? 'yes' : 'no';
      this.modalOpen = true;
    });

    _reportIssueService.report().subscribe(x => {
      const reportIssueViewModel = new ReportIssueViewModel(x, () => this.reportIssueViewModels.remove(reportIssueViewModel), _stats);
      this.reportIssueViewModels.push(reportIssueViewModel);
    });
  }

  ngOnInit () {
    this._reportIssueService.reportPendingIssues();
  }

  reportIssue () {
    this.modalOpen = false;
    this._reportIssueService.reportIssue({
      svgName: this.svgName,
      svgContent: this.svgContent,
      target: this.target,
      fixFillType: this.fixFillType,
      userAgent: this.userAgent,
      browserLanguage: this.browserLanguage,
      additionalInformation: this.additionalInformation,
    });

    this._stats.event({ 'report-issue.report-issue:additional-information': this.additionalInformation ? true : false });
  }
}

class ReportIssueViewModel {
  alertType: string;
  alertText: string;
  countdownText: string;
  canRetry: boolean;
  private _closed = true;

  constructor (
    private readonly _request: ReportIssueRequest,
    private readonly _done: () => void,
    private readonly _stats: StatsService
  ) {
    const open = this.open.bind(this);
    _request.error().subscribe(open, null, open);
  }

  private _intervalId;

  private clearInterval () {
    clearInterval(this._intervalId);
    this._intervalId = undefined;
  }

  private open () {
    this.clearInterval();
    if (this._request.success()) {
      this.alertType = 'alert-success';
      this.alertText = `The conversion issue with <span class='card-filename'>${this._request.data.svgName}</span> has been reported successfully: <a href='${this._request.issueUrl}'>${this._request.issueUrl}</a>. Thank you!`;
      this.countdownText = null;
      this.canRetry = false;
    } else {
      this.alertType = 'alert-danger';
      this.alertText = `Could not report the conversion issue with <span class='card-filename'>${this._request.data.svgName}</span>. ${this._request.errorMessage}`.endWith('.');
      this.updateCountdownText();
      this._intervalId = setInterval(this.updateCountdownText.bind(this), 1000);
      this.canRetry = true;
    }
    this._closed = false;
  }

  private updateCountdownText () {
    const autoRetryAt = this._request.autoRetryAt;
    const now = new Date().getTime();
    if (!autoRetryAt || autoRetryAt < now) {
      this.clearInterval();
      this.countdownText = null;
      return;
    }
    this.countdownText = `Automatic retry in ${this.formatTimeSpan(autoRetryAt - now)}…`;
  }

  private formatTimeSpan (value: number) {
    value = Math.round(value / 1000);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value - hours * 3600) / 60);
    const seconds = value - hours * 3600 - minutes * 60;
    return `${hours ? hours + ':' : ''}${hours && minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }

  get alertClosed () {
    return this._closed || this._request.loading;
  }

  set alertClosed (value) {
    this._closed = value;
    if (value) {
      this.clearInterval();
    }
    if (value && this._request.success()) {
      this._done();
    }
  }

  retry () {
    this._request.load();

    this._stats.event({ 'report-issue.retry': this._stats.noValue });
  }
}

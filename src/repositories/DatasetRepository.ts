import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { Dataset, Report } from '../entities';
import { Errors } from '../lib';

type DatasetWithReports = Dataset & { reports: Report[] };

@injectable()
export class DatasetRepository extends BaseRepository<Dataset> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'datasets');
    }

    async updateDataset(
        datasetId: number,
        newDataset: Dataset,
        trx
    ): Promise<Dataset> {
        const isDeleted = await this.deleteWhere(
            {
                id: datasetId,
            },
            trx
        );

        if (!isDeleted) {
            throw new Errors.InternalError('Failed to update dataset.', {
                method: 'UpdateDataset',
                datasetId: datasetId,
            });
        }

        const dataset = await this.create(newDataset, trx);
        return dataset;
    }

    async GetDatasetsByAppUserId(appUserID: string, isAdmin: boolean) {
        const where = {
            appUserId: appUserID,
        };
        if (isAdmin) {
            delete where.appUserId;
        }

        const sharedReportIds = await this.getAllWhere(where);
        return sharedReportIds;
    }

    async GetDatasetsWithTemplateReports() {
        const query = this.kS
            .get()
            .select(
                'd.*',
                'r.id as report_id',
                'r.deletedAt as report_deletedAt',
                'r.createdAt as report_createdAt',
                'r.updatedAt as report_updatedAt',
                'r.content as report_content',
                'r.description as report_description',
                'r.isSystem as report_isSystem',
                'r.isPinwallable as report_isPinwallable',
                'r.isFavourite as report_isFavourite',
                'r.title as report_title',
                'r.visualizationType as report_visualizationType',
                'r.datasetId as report_datasetId',
                'r.qlikStateId as report_qlikStateId',
                'r.pageId as report_pageId',
                'r.appId as report_appId',
                'r.tenantId as report_tenantId',
                'r.customerId as report_customerId',
                'r.appUserId as report_appUserId',
                'r.templateId as report_templateId'
            )
            .distinct()
            .from({ d: 'datasets' })
            .leftJoin({ r: 'reports' }, 'r.datasetId', 'd.id')
            .whereNotNull('templateId')
            .where({
                'r.isSystem': true,
                'r.deletedAt': null,
                'd.deletedAt': null,
            });

        const resultDb = await query;

        const datasets: DatasetWithReports[] = [];
        this.mapResultToDatasetWithReports(resultDb, datasets);
        return datasets;
    }

    private mapResultToDatasetWithReports(
        resultDb: any[],
        datasets: (Dataset & { reports: Report[] })[]
    ) {
        resultDb.forEach((d) => {
            if (datasets.some((ds) => ds.id === d.id)) {
                const dataset = datasets.find((ds) => ds.id === d.id);
                const report: Report = this.getReportFromRaw(d);
                dataset.reports.push(report);
            } else {
                const dataset: Dataset = this.getDatasetFromRaw(d);
                const report: Report = this.getReportFromRaw(d);
                datasets.push({ ...dataset, reports: [report] });
            }
        });
    }

    private getDatasetFromRaw(d: any) {
        const dataset: Dataset = {};
        Object.keys(d).forEach((key) => {
            if (!key.includes('report_')) {
                dataset[key] = d[key];
            }
        });
        return dataset;
    }

    private getReportFromRaw(d: any) {
        const report: Report = {};
        Object.keys(d).forEach((key) => {
            if (key.includes('report_')) {
                report[key.replace('report_', '')] = d[key];
            }
        });
        return report;
    }
}

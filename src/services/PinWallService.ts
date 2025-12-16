import { Transaction } from 'knex/lib';
import { injectable } from 'tsyringe';
import { parseTextFields } from '../actions/pin-walls/util';
import { PinWallContent } from '../entities';
import { PinWallRepository, ReportRepository } from '../repositories';

@injectable()
export class PinWallService {
    constructor(
        private reportRepository?: ReportRepository,
        private pinWallRepository?: PinWallRepository
    ) {}

    async RemoveReportFromPinWall(
        reportId: number,
        appUserId: string,
        customerId: string,
        tenantId: string,
        appId: string,
        trx: Transaction = null
    ) {
        const pinwalls = await this.pinWallRepository.findAll(
            {
                appUserId,
                customerId,
                tenantId,
                appId,
            },
            null
        );

        if (pinwalls.length === 0) {
            return;
        }

        const pinWallsToUpdate = pinwalls.filter((p) => {
            const result = filterReportVisualizationIds(
                parseTextFields(p.content) as PinWallContent
            );
            return result ? result.reportIds.includes(reportId) : false;
        });

        if (!pinWallsToUpdate && !Array.isArray(pinWallsToUpdate)) {
            return;
        }

        pinWallsToUpdate.forEach(async (pinWall) => {
            pinWall.content = removeReportIdFromContent(
                parseTextFields(pinWall.content) as PinWallContent,
                reportId
            ) as any;
            await this.pinWallRepository.update(
                pinWall.id,
                pinWall,
                false,
                trx
            );
        });
    }

    async CheckIfReportIdIsValid(
        content: PinWallContent,
        customerId: string,
        tenantId: string,
        appId: string,
        _appUserId: string
    ) {
        if (!content.cells) {
            return true;
        }

        const ids = filterReportVisualizationIds(content);

        if (!ids) {
            return false;
        }

        if (ids.reportIds.length === 0) {
            return true;
        }

        const reportIds = (
            await this.reportRepository.findAllIn(ids.reportIds, 'id', {
                customerId,
                tenantId,
                appId,
                isPinwallable: true,
            })
        ).map((r) => r.id);

        const notFoundReportIds = ids.reportIds.filter(
            (r) => !reportIds.includes(r)
        );
        const valid = notFoundReportIds.length === 0;

        return valid;
    }

    async GetFiltersForPinWall(
        content: PinWallContent
    ): Promise<{ [key: string]: string[] }> {
        const reportIdsFromContent = content.cells
            .map((cell) => cell.reportId)
            .filter((report) => report)
            .reduce((unique, report) => {
                if (!unique.includes(report)) {
                    unique.push(report);
                }
                return unique;
            }, []);

        const reports = await this.reportRepository.findAllInAndInclude(
            reportIdsFromContent,
            'id',
            ['dataset']
        );

        if (!reports) {
            return {};
        }
        const filtersGroupedByQlikAppId = reports.reduce((acc, report) => {
            const dataset = report.dataset;
            const qlikAppId = dataset.qlikAppId;
            const content = JSON.parse(report.content);
            const reportFilters = content.filters;

            if (!acc[qlikAppId]) {
                acc[qlikAppId] = [];
            }

            reportFilters.forEach((filter) => {
                if (!acc[qlikAppId].includes(filter)) {
                    acc[qlikAppId].push(filter);
                }
            });

            return acc;
        }, {}) as { [key: string]: string[] };

        return filtersGroupedByQlikAppId;
    }
}

const filterReportVisualizationIds = (
    content: PinWallContent
): { reportIds: number[]; visualizationIds: string[] } => {
    if (!content || !content.cells) {
        return;
    }

    const result: { reportIds: number[]; visualizationIds: string[] } = {
        reportIds: [],
        visualizationIds: [],
    };

    const cells = content.cells;

    cells.forEach((cell) => {
        const visualizationId = cell.visualizationId;
        const reportId = cell.reportId;

        if (visualizationId && !visualizationId.includes('empty')) {
            result.visualizationIds.push(visualizationId);
        }
        if (reportId && !result.reportIds.includes(reportId)) {
            result.reportIds.push(reportId);
        }
    });

    return result;
};

const removeReportIdFromContent = (
    content: PinWallContent,
    reportIdToRemove: number
) => {
    if (!content) {
        return;
    }

    const data = { ...content };

    data.cells.forEach((cell) => {
        const reportId = cell.reportId;

        if (reportId && reportId === reportIdToRemove) {
            delete cell.reportId;
            cell.visualizationId = `empty-${cell.x}-${cell.x}`;
        }
    });
    return data;
};

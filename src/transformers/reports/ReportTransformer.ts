import { Report } from '../../entities';
import * as DatasetTransformer from './DatasetTransformer';
import * as QlikStateTransformer from './QlikStateTransformer';

const transformReport = (report: Report): Report => {
    const result: Report = {
        id: report.id,
        content: report.content,
        title: report.title,
        description: report.description,
        tenantId: report.tenantId,
        appId: report.appId,
        customerId: report.customerId,
        visualizationType: report.visualizationType,
        appUserId: report.appUserId,
        isSystem: report.isSystem,
        shared: report.shared,
        sharedWithOthers: report.sharedWithOthers,
        isPinwallable: report.isPinwallable,
        dataset: DatasetTransformer.transformDataset(report.dataset),
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        pageId: report.pageId,
        user: report.user,
        templateId: report.templateId,
    };

    if (report.qlikState) {
        result.qlikState = QlikStateTransformer.transformQlikState(
            report.qlikState
        );
    }

    result['isCustomerReport'] = !report.templateId;

    if (!report.shared && !report.isSystem) {
        result.isFavourite = report.isFavourite;
    }

    return result;
};

export { transformReport };

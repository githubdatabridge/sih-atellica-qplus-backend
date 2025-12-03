import { Report } from '../../entities';

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
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        pageId: report.pageId,
        user: report.user,
        templateId: report.templateId,
    };

    result['isCustomerReport'] = !report.templateId;

    return result;
};
export { transformReport };

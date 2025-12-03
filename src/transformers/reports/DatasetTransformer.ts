import { Dataset } from '../../entities';

const transformDataset = (dataset: Dataset): Dataset => {
    const result: Dataset = {
        id: dataset.id,
        qlikAppId: dataset.qlikAppId,
        appUserId: dataset.appUserId,
        title: dataset.title,
        description: dataset.description,
        label: dataset.label,
        customerId: dataset.customerId,
        tenantId: dataset.tenantId,
        appId: dataset.appId,
        type: dataset.type,
        dimensions: dataset.dimensions,
        measures: dataset.measures,
        visualizations: dataset.visualizations,
        filters: dataset.filters,
        tags: dataset.tags,
        color: dataset.color,
        createdAt: dataset.createdAt,
        updatedAt: dataset.updatedAt,
    };

    if (dataset.qlikApp) {
        result.qlikApp = dataset.qlikApp;
    }
    return result;
};

export { transformDataset };

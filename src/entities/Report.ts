import { QlikState } from '.';
import { AppUser } from './AppUser';
import { BaseEntity } from './BaseEntity';
import { Dataset } from './Dataset';
import { UserMetadata } from './UserMetadata';

export interface Report extends BaseEntity, UserMetadata {
    content?: string;
    title?: string;
    description?: string;
    visualizationType?: string;
    appUserId?: string;
    isSystem?: boolean;
    shared?: boolean;
    sharedWithOthers?: boolean;
    isPinwallable?: boolean;
    isFavourite?: boolean;
    datasetId?: number;
    dataset?: Dataset;
    qlikStateId?: number;
    qlikState?: QlikState;
    pageId?: string;
    user?: AppUser;
    templateId?: number;
}

export enum VisualizationType {
    Table = 'table',
    PivotTable = 'pivot-table',
    BarChart = 'barchart',
    LineChart = 'linechart',
    PieChart = 'piechart',
    ComboChart = 'combochart',
    ScatterPlot = 'scatterplot',
    Map = 'map',
    DistributionPlot = 'distributionplot',
    TreeMap = 'treemap',
    Kpi = 'kpi',
}

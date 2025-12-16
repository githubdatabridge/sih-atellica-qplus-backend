import { Knex } from 'knex';
const tableName = 'datasets';

const visualizationTypes = [
    'table',
    'pivot-table',
    'barchart',
    'linechart',
    'piechart',
    'combochart',
    'scatterplot',
    'map',
    'distributionplot',
    'treemap',
    'kpi',
];

function getDefaults(visualizationTypes) {
    const result = [];
    visualizationTypes.forEach((element) => {
        result.push({
            name: element,
            isBaseChart: true,
        });
    });
    return result;
}

export async function up(knex: Knex): Promise<void> {
    const defaultValue = JSON.stringify(getDefaults(visualizationTypes));
    return await knex.schema.alterTable(tableName, (table) => {
        table.text('visualizations').notNullable().defaultTo(defaultValue);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('visualizations');
    });
}

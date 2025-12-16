import type { Knex } from 'knex';
import { Dataset, Report } from '../../entities';
import { readFileSync } from 'fs';
import path = require('path');
interface Dictionary<T> {
    [Key: string]: T;
}
type DatasetWithReports = Dataset & { reports: Report[] };
type SeedData = { apps: Dictionary<string>; datasets: DatasetWithReports[] };

export async function syncDatasetsAndReports(
    trx: Knex.Transaction<any, any[]>,
    datasets: (Dataset & { reports: Report[] })[]
) {
    await trx.schema.alterTable('reports', (table) => {
        table.integer('templateId').nullable().alter();
    });
    await trx('datasets')
        .whereNotIn(
            'id',
            datasets.map((dataset) => dataset.id)
        )
        .delete();

    for (const dataset of datasets) {
        const datasetWithoutReports = { ...dataset };
        delete datasetWithoutReports.reports;
        await trx('datasets')
            .insert(datasetWithoutReports)
            .onConflict('id')
            .merge();

        await trx('reports')
            .whereNotNull('templateId')
            .whereNotIn(
                'templateId',
                dataset.reports.map((report) => report.templateId)
            )
            .delete();

        for (const report of dataset.reports) {
            delete report.id;
            await trx('reports')
                .insert(report)
                .onConflict('templateId')
                .merge();
        }
    }
}

const pathFile = path.resolve(`${__dirname}/../seeds/exported_dataset.json`);
const dataJson = readFileSync(pathFile, 'utf8');
const data: SeedData = JSON.parse(dataJson);

export async function up(knex: Knex): Promise<void> {
    await knex.transaction(async (trx) => {
        await trx.schema.alterTable('reports', (table) => {
            table.string('templateId').unique().nullable().alter();
        });

        await syncDatasetsAndReports(trx, data.datasets);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.transaction(async (trx) => {
        await trx.raw('TRUNCATE TABLE datasets RESTART IDENTITY CASCADE');
        await trx.raw('TRUNCATE TABLE reports RESTART IDENTITY CASCADE');
    });
}

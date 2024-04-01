import type {File} from '@babel/types';
import type {RecastCodemod} from '@remotion/studio-shared';
import * as recast from 'recast';
import * as tsParser from 'recast/parsers/babel-ts';
import type {Change} from './recast-mods';
import {applyCodemod} from './recast-mods';

const getPrettier = async () => {
	try {
		return await import('prettier');
	} catch (err) {
		throw new Error('Prettier cannot be found in the current project.');
	}
};

export const formatOutput = async (tsContent: string) => {
	const prettier = await getPrettier();

	const {format, resolveConfig, resolveConfigFile} = prettier;

	const configFilePath = await resolveConfigFile();
	if (!configFilePath) {
		throw new Error('The Prettier config file was not found');
	}

	const prettierConfig = await resolveConfig(configFilePath);
	if (!prettierConfig) {
		throw new Error(
			`The Prettier config at ${configFilePath} could not be read`,
		);
	}

	const newContents = await format(tsContent, {
		...prettierConfig,
		filepath: 'test.tsx',
	});

	return newContents;
};

export const parseAndApplyCodemod = async ({
	input,
	codeMod,
}: {
	input: string;
	codeMod: RecastCodemod;
}): Promise<{newContents: string; changesMade: Change[]}> => {
	const ast = recast.parse(input, {
		parser: tsParser,
	}) as File;

	const {newAst, changesMade} = applyCodemod({
		file: ast,
		codeMod,
	});

	if (changesMade.length === 0) {
		throw new Error('Could not find changes to made to the file');
	}

	const output = recast.print(newAst, {
		parser: tsParser,
	}).code;

	return {changesMade, newContents: output};
};

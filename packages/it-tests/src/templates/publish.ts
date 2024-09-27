import {$} from 'bun';
import {CreateVideoInternals, Template} from 'create-video';
import {cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'path';

const folders = CreateVideoInternals.FEATURED_TEMPLATES.filter(
	(t) => t.templateInMonorepo !== null,
);

const publish = async (template: Template) => {
	const folder = path.join(
		process.cwd(),
		'..',
		template.templateInMonorepo as string,
	);

	const tmpDir = tmpdir();
	const workingDir = path.join(tmpDir, `template-${Math.random()}`);

	await $`git add .`.cwd(folder);
	const files = await $`git ls-files`.cwd(folder).quiet();
	const filesInTemplate = files.stdout
		.toString('utf-8')
		.trim()
		.split('\n')
		.filter(Boolean);

	const branchName = `${Math.random().toString().replace('0.', '')}`;

	await $`git clone git@github.com:remotion-dev/${template.repoName}.git ${workingDir}`;
	await $`git checkout -b ${branchName}`.cwd(workingDir);
	const existingFilesInRepo = await $`git ls-files`.cwd(workingDir).quiet();
	for (const file of existingFilesInRepo.stdout
		.toString('utf-8')
		.trim()
		.split('\n')) {
		await $`rm ${file}`.cwd(workingDir).quiet();
	}

	for (const file of filesInTemplate) {
		const src = path.join(folder, file);
		const dst = path.join(workingDir, file);
		cpSync(src, dst);

		if (file === 'package.json') {
			const dstFile = await Bun.file(dst).text();
			const currentVersion = dstFile.replaceAll('workspace:*', '^4.0.0');
			await Bun.write(dst, currentVersion);
		}
	}

	await $`git add .`.cwd(workingDir).nothrow();
	const hasChanges = await $`git status --porcelain`.cwd(workingDir).text();
	if (!hasChanges) {
		console.log(`No changes in ${template.shortName}`);
		return;
	}

	await $`git commit -m "Update template"`.cwd(workingDir);
	await $`git diff main ${branchName}`.cwd(workingDir).quiet().text();
	await $`git push origin ${branchName}`.cwd(workingDir);
};

for (const template of folders) {
	await publish(template);
}

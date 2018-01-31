const MODULE_NAME = 'nex-utils';

// Errors:
// import 'nex-utils';
// import * as utils from 'nex-utils';
// import utils from 'nex-utils';
// require('nex-utils');
//
//
// Ingore:
// import Button from 'nex-utils/omit';
// require('nex-utils/pick')
module.exports = function(babel) {
	const { types: t } = babel;

	return {
		visitor: {
			CallExpression(path) {
				const { node } = path;

				// no require('nex-utils') calls
				if (
					t.isIdentifier(node.callee, { name: 'require' }) &&
					node.arguments &&
					node.arguments.length === 1
				) {
					const source = node.arguments[0];
					if (t.isStringLiteral(source, { value: MODULE_NAME })) {
						throw path.buildCodeFrameError(
							`require('${MODULE_NAME}') is not allowed, use import { ... } from '${MODULE_NAME}'`
						);
					}
				}
			},

			ImportDeclaration(path, state) {
				const { node } = path;
		
				if (t.isStringLiteral(node.source, { value: MODULE_NAME })) {
					const { specifiers } = node;
					const specifierCount = specifiers.length;

					// no import 'nex-utils';
					if (specifierCount === 0) {
						throw path.buildCodeFrameError(
						 `Side-effect only import is allowed in ${MODULE_NAME}.`
						);
					}

					const replacement = specifiers.reduce((r, sp) => {
						// no import * as utils from 'nex-utils'
						if (t.isImportNamespaceSpecifier(sp)) {
							throw path.buildCodeFrameError(
								`Namespace import is not allowd in ${MODULE_NAME}, pick the functions you need.`
							);
						}

						// no import utils from 'nex-utils'
						if (t.isImportDefaultSpecifier(sp)) {
							throw path.buildCodeFrameError(
								`There is no default export in ${MODULE_NAME}. use import { ... } from '${MODULE_NAME}'`
							);
						}

						if (t.isImportSpecifier(sp)) {
							return r.concat(buildImportReplacement(sp, t, state, path));
						}

						throw path.buildCodeFrameError('Unexpected import type');
					}, []);

					path.replaceWithMultiple(replacement);
				}
			}
		}
	};
};

function buildImportReplacement(specifier, types, state, originalPath) {
	// import {each as forEach} from 'nex-utils'
	// imported name is each, but local name is forEach} 

	const importedName = specifier.imported.name;
	const localName = specifier.local.name;
	const replacement = [];

 	replacement.push(
		types.importDeclaration(
			[types.importDefaultSpecifier(types.identifier(localName))],
			types.stringLiteral(`${MODULE_NAME}/${importedName}`)
		)
	);

	return replacement;
}

const Marked   = require('marked');
const _        = require('lodash');
const Entities = require('entities');

// Custom tokenizer
const tokenizer = {
    hr(src) {
        const match = src.match(/^---(.*?)---/gs);

        if (match) {
            const stripped = match[0].replace(/---/g, '').trim();

            return {
                type: 'hr',
                raw: match[0],
                text: stripped,
                tokens: stripped.split('\n').map((l) => {
                    const chunk = l.split(':').map(c => c.trim());

                    return {
                        type: 'tag',
                        raw: l,
                        name: chunk[0],
                        value: chunk[1]
                    }
                })
            }
        } else {
            return false;
        }
    }
}

Marked.use({ tokenizer });

/**
 *
 * @param {*} block
 * @returns
 */
function NormalizeTokens(block) {
    let result = block.text;

    if (block.type === 'image') {
        result = '';
    } else if (block.type === 'codespan') {
        result = block.raw;
    } else if(_.isArray(block.tokens)) {
        _.forEach(block.tokens, (token) => {
            result = result.replace(
                token.raw, NormalizeTokens(token)
            );
        });
    }

    return result;
}

/**
 *
 */
const Normalizer = {

    /**
     * Extract ONLY title and return it as string
     *
     * @param {Object} block
     *
     * @returns {String}
    */
    hr: (block) => {
        let response = null;

        _.forEach(block.tokens, (t) => {
            if (t.type === 'tag' && t.name === 'title') {
                response = t.value.trim();
            }
        });

        return response;
    },

    /**
     * Header just uppercase it
     *
     * @param {Object} block
     *
     * @returns {String}
     */
    heading: (block) => {
        return block.raw.trim();
    },

    /**
     * Normalize paragraph by removing images and links
     *
     * @param {Object} block
     *
     * @returns {String}
     */
    paragraph: (block) => {
        const result = NormalizeTokens(block);

        return `${result.trim()}\n`;
    },

    /**
     *
     * @param {*} block
     * @returns
     */
    list: (block) => {
        const response = [];

        _.forEach(block.items, (item) => {
            response.push(NormalizeTokens(item.tokens[0]));
        });

        return response.map(r => `- ${r}`).join('\n');
    },

    /**
     *
     * @param {*} block
     * @returns
     */
    code: (block) => `${block.raw}\n`

};

module.exports = {

    /**
     *
     * @param {*} content
     * @returns
     */
    parse: async (content) => {
        const response = {
            title: null,
            content: ''
        }

        const blocks = [];
        const tokens = Marked.Lexer.lex(content);

        _.forEach(tokens, (token) => {
            let block = null;

            if (token.type === 'hr') {
                response.title = Normalizer.hr(token);
            } else if (!_.isUndefined(Normalizer[token.type])) {
                block = Normalizer[token.type](token);
            }

            if (!_.isNull(block)) {
                blocks.push(block);
            }
        });

        const c = blocks.join('\n').replace(/\n{3,}/g,'\n\n').trim();

        // Finally decode any HTML entities
        response.text = Entities.decode(c);

        return response;
    }

}
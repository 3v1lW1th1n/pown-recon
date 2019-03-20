const assert = require('assert')
const cytoscape = require('cytoscape')
const { EventEmitter } = require('events')
const { setInterval, clearInterval } = require('timers')

const { makeId } = require('./utils')
const { isUrl, isEmail, isIpv4, isIpv6, isDomain } = require('./detect')

class Recon extends EventEmitter {
    constructor(options = {}) {
        super()

        const { cy, maxWarnNodes = 100, ...settings } = options

        if (cy) {
            this.cy = cy
        }
        else {
            this.cy = cytoscape({
                ...settings,

                headless: true
            })
        }

        this.maxWarnNodes = maxWarnNodes

        this.transformers = {}

        this.selection = this.cy.collection()
    }

    serialize() {
        return this.cy.json()
    }

    deserialize(input) {
        this.cy.json(input)
    }

    registerTransforms(transforms) {
        Object.entries(transforms).forEach(([name, transform]) => {
            this.transformers[name.toLowerCase()] = transform
        })
    }

    addNodes(nodes) {
        if (nodes.length > this.maxWarnNodes) {
            this.emit('warn', `Adding ${nodes.length} node`)
        }

        let collection = this.cy.collection()

        nodes.forEach(({ id, type, label, edges = [], ...data }) => {
            assert.ok(type, `Node type is not specified.`)

            if (!id) {
                id = makeId(type, label)
            }

            let node = this.cy.getElementById(id)

            if (node.length) {
                try {
                    node.data({ ...node.data(), type, label, ...data })
                }
                catch (e) {
                    this.emit('error', e)

                    return
                }
            }
            else {
                try {
                    node = this.cy.add({
                        group: 'nodes',
                        data: {
                            ...data,

                            id,
                            type,
                            label
                        }
                    })
                }
                catch (e) {
                    this.emit('error', e)

                    return
                }
            }

            try {
                collection = collection.add(node)
            }
            catch (e) {
                this.emit('error', e)

                return
            }

            edges.forEach((edge) => {
                let target
                let type
                let data

                if (typeof(edge) === 'string') {
                    target = edge
                    type = ''
                    data = {}
                }
                else {
                    target = edge.target || ''
                    type = edge.type || ''
                    data = edge
                }

                const source = id

                try {
                    const edgeElement = this.cy.add({
                        group: 'edges',
                        data: {
                            id: `edge:${type}:${source}:${target}`,
                            source: source,
                            target: target,

                            ...data
                        }
                    })

                    collection = collection.add(edgeElement)
                }
                catch (e) {
                    this.emit('error', e)

                    return
                }
            })
        })

        return this.selection = collection.nodes()
    }

    removeNodes(nodes) {
        throw new Error(`Not implemented`) // TODO: add code here
    }

    select(...selectors) {
        return this.selection = this.cy.nodes(selectors.join(','))
    }

    unselect() {
        return this.selection = this.cy.collection()
    }

    group(label, selection = this.selection) {
        const parentId = makeId('group', label)

        this.cy.add({
            data: {
                id: parentId,
                type: 'group',
                label: label,
                props: {}
            }
        })

        selection.move({ parent: parentId })
    }

    ungroup(selection = this.selection) {
        selection.move({ parent: null })

        // TODO: cleanup the parent if no longer required
    }

    measure(selection = this.selection) {
        selection
            .nodes()
            .forEach((node) => {
                node.data('weight', node.connectedEdges().length)
            })
    }

    unmeasure(selection = this.selection) {
        selection
            .nodes()
            .forEach((node) => {
                node.data('weight', 0)
            })
    }

    async transform(transformation, options = {}, settings = {}) {
        const { noise = 10, group = false, weight = false, extract } = settings

        let transformerNames

        if (transformation === '*') {
            transformerNames = Object.keys(this.transformers)
        }
        else {
            transformerNames = [transformation.toLowerCase()]
        }

        let transformers = transformerNames.map((transformerName) => {
            if (!this.transformers.hasOwnProperty(transformerName)) {
                throw new Error(`Unknown transformer ${transformerName}`)
            }

            const transformer = new this.transformers[transformerName]()

            transformer.on('info', (...args) => {
                this.emit('info', ...args)
            })

            transformer.on('warn', (...args) => {
                this.emit('warn', ...args)
            })

            transformer.on('error', (...args) => {
                this.emit('error', `${JSON.stringify(transformer.constructor.title)} ->`, ...args)
            })

            return transformer
        })

        let nodes = this.selection.map((node) => {
            return node.data()
        })

        if (transformation === '*') {
            const nodeTypes = [].concat(...Array.from(new Set(nodes.map(({ type, label }) => {
                const types = []

                if (type) {
                    types.push(type)
                }

                if (label) {
                    if (isUrl(label)) {
                        types.push('uri')
                    }
                    else
                    if (isEmail(label)) {
                        types.push('email')
                    }
                    else
                    if (isIpv4(label)) {
                        types.push('ipv4')
                    }
                    else
                    if (isIpv6(label)) {
                        types.push('ipv6')
                    }
                    else
                    if (isDomain(label)) {
                        types.push('domain')
                    }

                    // TODO: add additional auto types
                }

                return types
            }))))

            transformers = transformers.filter(({ constructor = {} }) => constructor.noise <= noise)
            transformers = transformers.filter(({ constructor = {} }) => constructor.types.some((type) => nodeTypes.includes(type)))
        }

        if (extract) {
            const { property, prefix = '', suffix = '' } = extract

            if (property) {
                nodes = nodes.map(({ props, ...rest }) => {
                    const label = `${prefix}${props[property] || ''}${suffix}`

                    return { ...rest, props, label }
                })
            }
        }

        let results = await Promise.all(transformers.map(async(transformer) => {
            const name = transformer.constructor.title
            const quotedName = JSON.stringify(name)

            this.emit('info', `Starting transformer ${quotedName}...`)

            const interval = setInterval(() => {
                this.emit('info', `Transformer ${quotedName} still running...`)
            }, 10000)

            let actualNodes

            if (transformation === '*') {
                actualNodes = nodes.filter(({ type }) => transformer.constructor.types.includes(type))
            }
            else {
                actualNodes = nodes
            }

            let result

            try {
                result = await transformer.run(actualNodes, options)
            }
            catch (e) {
                result = []

                this.emit('warn', `Transformer ${quotedName} failed.`)
                this.emit('error', `${name}:`, e)
            }

            clearInterval(interval)

            this.emit('info', `Transformer ${quotedName} finished.`)

            if (result.length) {
                if (group) {
                    const label = transformer.constructor.title

                    const parentId = makeId('group', label)

                    result.unshift({ id: parentId, type: 'group', label, props: {}, edges: [] })

                    result.forEach((result) => {
                        result.parent = parentId
                    })
                }
            }

            return result
        }))

        results = [].concat(...results)

        const oldSelection = this.selection

        this.addNodes(results)

        if (weight) {
            this.measure(oldSelection)
        }

        return results
    }
}

module.exports = { Recon }

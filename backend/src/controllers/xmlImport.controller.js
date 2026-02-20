import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { parseString } from 'xml2js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────
// XML Import Controller (XXE Vulnerable)
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/import/products/xml
 * Import products from XML data.
 * 
 * VULNERABLE: XXE (XML External Entity) injection - parser processes external entities
 * This allows attackers to:
 * - Read local files from the server
 * - Perform SSRF attacks
 * - Cause denial of service
 * 
 * Maps to: OWASP A03:2021 – Injection
 * PortSwigger – XML External Entity (XXE) injection
 */
async function importProductsXml(req, res, next) {
    try {
        const { xmlData, filePath } = req.body;

        let xmlContent = xmlData;

        // If file path is provided, read from file system (additional XXE vector)
        if (filePath) {
            // VULNERABLE: Path traversal potential
            // Attacker might try to read arbitrary files via import
            try {
                xmlContent = fs.readFileSync(filePath, 'utf-8');
            } catch (err) {
                // Continue with provided xmlData
            }
        }

        if (!xmlContent) {
            return res.status(400).json({
                status: 'error',
                message: 'XML data is required.',
            });
        }

        // VULNERABLE: XXE injection - XML parser is configured to process external entities
        // This is the intentional vulnerability for security testing
        // Maps to: PortSwigger – XXE Injection
        const parserConfig = {
            trim: true,
            explicitArray: false,
            // VULNERABLE: Not disabling external entities - allows XXE attacks
            // In a secure implementation, this should be: { entityResolver: () => null }
            normalizeTags: false,
            // VULNERABLE: Default xml2js settings allow external entity processing
        };

        // Parse the XML (vulnerable to XXE)
        parseString(xmlContent, parserConfig, async (err, result) => {
            if (err) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid XML format.',
                    error: err.message,
                });
            }

            try {
                const products = result.products?.product || [];
                const productArray = Array.isArray(products) ? products : [products];

                const importedProducts = [];
                const errors = [];

                for (let i = 0; i < productArray.length; i++) {
                    try {
                        const p = productArray[i];
                        
                        // Extract product data from XML
                        const title = p.title || `Imported Product ${i + 1}`;
                        const description = p.description || null;
                        const price = parseFloat(p.price) || 0;
                        const stock = parseInt(p.stock, 10) || 0;
                        const sku = p.sku || null;
                        const categoryId = p.categoryId || null;

                        // Create product
                        const product = await prisma.product.create({
                            data: {
                                title,
                                slug: (title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `import-${i}`) + '-' + Date.now(),
                                description,
                                price,
                                stock,
                                sku,
                                vendorId: req.user.id,
                                categoryId: categoryId || null,
                                isActive: true,
                            },
                        });

                        importedProducts.push(product);

                        // Handle variants if present
                        if (p.variants?.variant) {
                            const variants = Array.isArray(p.variants.variant) 
                                ? p.variants.variant 
                                : [p.variants.variant];
                            
                            for (const v of variants) {
                                await prisma.productVariant.create({
                                    data: {
                                        name: v.name || 'Variant',
                                        value: v.value || 'Default',
                                        price: v.price ? parseFloat(v.price) : null,
                                        stock: parseInt(v.stock, 10) || 0,
                                        sku: v.sku || null,
                                        productId: product.id,
                                    },
                                });
                            }
                        }

                        // Handle images if present
                        if (p.images?.image) {
                            const images = Array.isArray(p.images.image) 
                                ? p.images.image 
                                : [p.images.image];
                            
                            for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
                                const imgUrl = images[imgIdx];
                                await prisma.productImage.create({
                                    data: {
                                        url: typeof imgUrl === 'string' ? imgUrl : imgUrl.url || '',
                                        altText: typeof imgUrl === 'object' ? (imgUrl.alt || 'Product image') : 'Product image',
                                        isPrimary: imgIdx === 0,
                                        productId: product.id,
                                    },
                                });
                            }
                        }

                    } catch (productError) {
                        errors.push({
                            index: i,
                            error: productError.message,
                        });
                    }
                }

                await createAuditLog({
                    userId: req.user.id,
                    action: 'PRODUCTS_XML_IMPORTED',
                    entity: 'Product',
                    metadata: { 
                        imported: importedProducts.length, 
                        errors: errors.length,
                        xmlSize: xmlContent.length,
                    },
                    req,
                });

                return res.status(201).json({
                    status: 'success',
                    message: `${importedProducts.length} products imported from XML.`,
                    data: {
                        imported: importedProducts.length,
                        products: importedProducts,
                        errors,
                    },
                });

            } catch (parseError) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Failed to parse XML product data.',
                    error: parseError.message,
                });
            }
        });

    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/import/products/xml/template
 * Get XML template for product import
 */
async function getXmlTemplate(req, res, next) {
    try {
        const template = `<?xml version="1.0" encoding="UTF-8"?>
<products>
    <product>
        <title>Sample Product</title>
        <description>Product description here</description>
        <price>29.99</price>
        <stock>100</stock>
        <sku>SKU-001</sku>
        <categoryId></categoryId>
        <variants>
            <variant>
                <name>Size</name>
                <value>Large</value>
                <price>35.00</price>
                <stock>50</stock>
                <sku>SKU-001-L</sku>
            </variant>
        </variants>
        <images>
            <image>https://example.com/image1.jpg</image>
        </images>
    </product>
</products>`;

        return res.status(200).json({
            status: 'success',
            data: { template },
        });
    } catch (error) {
        next(error);
    }
}

export {
    importProductsXml,
    getXmlTemplate,
};


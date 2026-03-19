// Se importa la librería de gráficos Chart.js y su plugin para etiquetas
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Se espera a que el contenido del DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
    // Se obtiene el botón para descargar el PDF
    const btnDescargar = document.getElementById('btnDescargarPDF');

    // Se define función para capitalizar la primera letra de un texto
    function capitalizar(texto) {
        return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    }

    try {
        // Se realiza petición para obtener las estadísticas desde el backend
        const res = await fetch('http://localhost:3000/api/admin/estadisticas');
        if (!res.ok) throw new Error('No se pudieron cargar las estadísticas');
        const data = await res.json();

        // Se define una función para crear gráficos en pantalla
        function crearGrafico(canvasId, config) {
            const ctx = document.getElementById(canvasId).getContext('2d');
            return new Chart(ctx, {
                ...config,
                options: {
                    ...config.options,
                    plugins: {
                        ...config.options.plugins,
                        datalabels: { display: false } // Se ocultan las etiquetas en el gráfico visible
                    }
                }
            });
        }

        // Configuración para cada gráfico

        // Se configura gráfico de pastel para mostrar la distribución de género
        const configGenero = {
            type: 'pie',
            data: {
                labels: ['Hombres', 'Mujeres'],
                datasets: [{
                    data: [data.hombres, data.mujeres],
                    backgroundColor: ['#4e79a7', '#f28e2c']
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: 'Distribución de género', font: { size: 20 } }
                }
            }
        };
        crearGrafico('graficaGenero', configGenero);

        // Se prepara gráfico de barras para mostrar número de vendedores por día
        const dias = Object.keys(data.diasVenta);
        const valoresDias = Object.values(data.diasVenta);
        const configDias = {
            type: 'bar',
            data: {
                labels: dias.map(capitalizar),
                datasets: [{
                    label: 'Número de vendedores',
                    data: valoresDias,
                    backgroundColor: '#59a14f'
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: 'Cantidad de vendedores por día de venta', font: { size: 20 } }
                }
            }
        };
        crearGrafico('graficaDias', configDias);

        // Se configura gráfico de pastel para mostrar estado de permisos
        const estadosPermiso = Object.keys(data.permisos);
        const cantidadesPermiso = Object.values(data.permisos);
        const configPermisos = {
            type: 'pie',
            data: {
                labels: estadosPermiso.map(capitalizar),
                datasets: [{
                    data: cantidadesPermiso,
                    backgroundColor: ['#4e79a7', '#f28e2c', '#e15759']
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: 'Estado de permisos de vendedores', font: { size: 20 } }
                }
            }
        };
        crearGrafico('graficaPermisos', configPermisos);

        // Se configura gráfico de dona para mostrar distribución por categoría de producto
        const categorias = Object.keys(data.categoriasProductos);
        const valoresCategorias = Object.values(data.categoriasProductos);
        const configCategorias = {
            type: 'doughnut',
            data: {
                labels: categorias.map(capitalizar),
                datasets: [{
                    data: valoresCategorias,
                    backgroundColor: ['#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac', '#86bc86']
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: 'Distribución por categorías de productos', font: { size: 20 } }
                }
            }
        };
        crearGrafico('graficaCategorias', configCategorias);

        // Se configura gráfico de barras para mostrar estado general de productos
        const configEstadoProductos = {
            type: 'bar',
            data: {
                labels: ['Aprobados', 'Rechazados', 'En revisión'],
                datasets: [{
                    label: 'Cantidad de productos',
                    data: [data.productosAprobados, data.productosRechazados, data.productosRevision],
                    backgroundColor: ['#59a14f', '#e15759', '#f28e2c']
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: 'Estado general de productos', font: { size: 20 } }
                }
            }
        };
        crearGrafico('graficaEstadoProductos', configEstadoProductos);

        // Se define función para crear gráficos para exportar a PDF
        async function crearGraficoPDF(config) {
            return new Promise(resolve => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 600;
                tempCanvas.height = 400;
                document.body.appendChild(tempCanvas);
                const ctx = tempCanvas.getContext('2d');

                const configPDF = {
                    ...config,
                    options: {
                        ...config.options,
                        plugins: {
                            ...config.options.plugins,
                            title: {
                                ...config.options.plugins.title,
                                font: { size: 60 }
                            },
                            datalabels: {
                                display: true,
                                color: '#000',
                                anchor: 'end',
                                align: 'top',
                                formatter: val => val,
                                font: { weight: '500', size: 35 }
                            },
                            legend: {
                                ...config.options.plugins.legend,
                                labels: {
                                    ...(config.options.plugins.legend?.labels || {}),
                                    font: { size: 35 }
                                }
                            }
                        },
                        scales: {
                            ...(config.options.scales || {}),
                            x: {
                                ...((config.options.scales && config.options.scales.x) || {}),
                                ticks: {
                                    ...(config.options.scales?.x?.ticks || {}),
                                    font: { size: 35 }
                                }
                            },
                            y: {
                                ...((config.options.scales && config.options.scales.y) || {}),
                                ticks: {
                                    ...(config.options.scales?.y?.ticks || {}),
                                    font: { size: 35 }
                                }
                            }
                        }
                    },
                    plugins: [ChartDataLabels]
                };

                const chartPDF = new Chart(ctx, configPDF);

                setTimeout(() => {
                    resolve({ canvas: tempCanvas, chart: chartPDF });
                }, 300);
            });
        }

        // Se agrega funcionalidad al botón para generar y descargar PDF
        btnDescargar.addEventListener('click', async () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');

            const topMargin = 60;
            let yPosition = topMargin;

            const margin = 40;
            const pageWidth = doc.internal.pageSize.getWidth();
            const maxWidth = pageWidth - margin * 2;

            // Se genera cada gráfico en versión PDF
            const configs = [configGenero, configDias, configPermisos, configCategorias, configEstadoProductos];
            const graficosPDF = await Promise.all(configs.map(cfg => crearGraficoPDF(cfg)));

            // Se insertan los gráficos al PDF uno por uno
            for (const { canvas, chart } of graficosPDF) {
                const imgData = canvas.toDataURL('image/png');

                let imgWidth = maxWidth * 0.7;
                let imgHeight = (canvas.height * imgWidth) / canvas.width;

                if (imgHeight > 300) imgHeight = 300;
                const adjustedImgWidth = (canvas.width * imgHeight) / canvas.height;
                const xPos = (pageWidth - adjustedImgWidth) / 2;

                if (yPosition + imgHeight > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    yPosition = topMargin;
                }

                doc.addImage(imgData, 'PNG', xPos, yPosition, adjustedImgWidth, imgHeight);
                yPosition += imgHeight + 40;

                chart.destroy();
                canvas.remove();
            }

            // Se guarda el archivo PDF generado
            doc.save('EstadisticasVendedores.pdf');
        });

    } catch (error) {
        // Se muestra mensaje de error si ocurre una falla durante la carga de datos
        console.error('Error al cargar estadísticas:', error);
    }
});



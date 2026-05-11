pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        PROJECT_NAME = 'malogbot'
        COMPOSE_FILE = 'docker-compose.yml'
        APP_PORT = '5000'
        HEALTH_CHECK_URL = "http://localhost:${APP_PORT}/"
        HEALTH_CHECK_RETRIES = 10
        HEALTH_CHECK_INTERVAL = 5
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    stages {
        stage('Checkout') {
            steps {
                echo '拉取最新代码...'
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/dev']], 
                    userRemoteConfigs: [[
                        credentialsId: '3170ba34-9602-4b4e-a47b-fdb19e85c072',
                        url: 'git@github.com:Ackenieo/MalogBot.git'
                    ]]
                ])
            }
        }

        stage('Setup') {
            steps {
                echo '检查环境依赖...'
                sh 'docker --version'
                sh 'docker compose version'
                sh 'node --version || true'
                sh 'npm --version || true'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '安装前端依赖...'
                dir('frontend') {
                    sh 'npm ci --prefer-offline || npm install'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                echo '构建前端...'
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo '构建 Docker 镜像...'
                sh "docker compose -f ${COMPOSE_FILE} build --no-cache"
            }
        }

        stage('Deploy') {
            steps {
                echo '停止旧容器并部署新服务...'
                sh "docker compose -f ${COMPOSE_FILE} down --remove-orphans"
                sh "docker compose -f ${COMPOSE_FILE} up -d"
            }
        }

        stage('Health Check') {
            steps {
                echo '等待服务启动...'
                sh "sleep ${HEALTH_CHECK_INTERVAL}"
                echo '执行健康检查...'
                script {
                    def retries = env.HEALTH_CHECK_RETRIES as Integer
                    def healthy = false
                    for (int i = 0; i < retries; i++) {
                        try {
                            sh "curl -f ${HEALTH_CHECK_URL} > /dev/null 2>&1"
                            healthy = true
                            echo "服务健康检查通过!"
                            break
                        } catch (Exception e) {
                            echo "健康检查失败，重试 ${i + 1}/${retries}..."
                            sh "sleep ${HEALTH_CHECK_INTERVAL}"
                        }
                    }
                    if (!healthy) {
                        error "服务健康检查失败，超过 ${retries} 次重试"
                    }
                }
            }
        }

        stage('Verify') {
            steps {
                echo '验证部署状态...'
                sh "docker compose -f ${COMPOSE_FILE} ps"
                sh "docker ps --filter name=${PROJECT_NAME} --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'"
            }
        }
    }

    post {
        success {
            echo '=========================================='
            echo "部署成功！ =ᗜωᗜ= ${PROJECT_NAME} 已更新"
            echo "访问地址: ${HEALTH_CHECK_URL}"
            echo '=========================================='
            sh "docker compose -f ${COMPOSE_FILE} ps"
        }
        failure {
            echo '=========================================='
            echo '部署失败! (｡í_ì｡) 请检查日志'
            echo '=========================================='
            sh "docker compose -f ${COMPOSE_FILE} logs --tail=50 || true"
        }
        cleanup {
            echo '清理未使用的镜像...'
            sh 'docker image prune -f' || true
        }
    }
}
